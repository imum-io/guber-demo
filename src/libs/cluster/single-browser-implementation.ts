
import * as puppeteer from 'puppeteer';
import ConcurrencyImplementation, { ResourceData } from './concurrency-implementation';

import { timeoutExecute } from './util';

const BROWSER_TIMEOUT = 5000;

async function launchExtraBrowser(options): Promise<puppeteer.Browser> {
    const puppeteer = require('puppeteer-extra')
    const StealthPlugin = require('puppeteer-extra-plugin-stealth')
    const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
    puppeteer.use(StealthPlugin())
    puppeteer.use(AdblockerPlugin({ blockTrackers: true }))
    const browser = await puppeteer.launch(options)
    return browser
}
export default abstract class SingleBrowserImplementation extends ConcurrencyImplementation {

    protected browser: puppeteer.Browser | null = null;

    private repairing: boolean = false;
    private repairRequested: boolean = false;
    private openInstances: number = 0;
    private waitingForRepairResolvers: (() => void)[] = [];

    private proxyUrl;

    public constructor(options: any, puppeteer: any) {
        super(options, puppeteer);
    }

    private async repair() {
        if (this.openInstances !== 0 || this.repairing) {
            // already repairing or there are still pages open? wait for start/finish
            await new Promise<void>(resolve => this.waitingForRepairResolvers.push(resolve));
            return;
        }

        this.repairing = true;
        console.log('Starting repair');

        try {
            // will probably fail, but just in case the repair was not necessary
            await (<puppeteer.Browser>this.browser).close();
        } catch (e) {
            console.log('Unable to close browser.');
        }

        try {
            // this.browser = await this.puppeteer.launch(this.options) as puppeteer.Browser;
            this.browser = await launchExtraBrowser(this.options)
        } catch (err) {
            throw new Error('Unable to restart chrome.');
        }
        this.repairRequested = false;
        this.repairing = false;
        this.waitingForRepairResolvers.forEach(resolve => resolve());
        this.waitingForRepairResolvers = [];
    }

    public async init() {
        // this.browser = await this.puppeteer.launch(this.options)
        this.browser = await launchExtraBrowser(this.options)
    }

    public async close() {
        await (this.browser as puppeteer.Browser).close();
    }

    protected abstract createResources(proxyUrl): Promise<ResourceData>;

    protected abstract freeResources(resources: ResourceData): Promise<void>;

    public async workerInstance() {
        let resources: ResourceData;

        return {
            jobInstance: async () => {
                if (this.repairRequested) {
                    await this.repair();
                }

                await timeoutExecute(BROWSER_TIMEOUT, (async () => {
                    this.proxyUrl = this.options.proxyUrls.shift()
                    resources = await this.createResources(this.proxyUrl);
                })());
                this.openInstances += 1;

                return {
                    resources,

                    close: async () => {
                        this.openInstances -= 1; // decrement first in case of error
                        await timeoutExecute(BROWSER_TIMEOUT, this.freeResources(resources));

                        if (this.repairRequested) {
                            await this.repair();
                        }
                    },
                };
            },

            close: async () => { },

            repair: async () => {
                console.log('Repair requested');
                this.repairRequested = true;
                await this.repair();
            },
        };
    }
}
