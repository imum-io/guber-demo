
import * as puppeteer from 'puppeteer';

import { ResourceData } from './concurrency-implementation';
import SingleBrowserImplementation from './single-browser-implementation';

export default class ContextWithProxy extends SingleBrowserImplementation {

    protected async createResources(proxyUrl): Promise<ResourceData> {     
        const context = await (this.browser as puppeteer.Browser)
            .createIncognitoBrowserContext({proxyServer:proxyUrl});
        const page = await context.newPage();
        return {
            context,
            page,
        };
    }

    protected async freeResources(resources: ResourceData): Promise<void> {
        await resources.context.close();
    }

}
