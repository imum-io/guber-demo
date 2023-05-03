// We'll use Puppeteer is our browser automation framework.
import { Page } from 'puppeteer'
import cheerio from 'cheerio'
import { jsonFromFile, sleep } from '../../utils'
import { Cluster } from 'puppeteer-cluster'
import ContextWithProxy from './context-with-proxy'
import moment from 'moment'
import { CronJob } from 'cron'
import Logger from '../logger'
import { proxyType } from '../../types/common'

interface ChromeNavigator extends Navigator {
    chrome: any;
}
type CachedCluster = {
    cluster: Cluster,
    createdAt: string,
    updatedAt: string,
}

type puppeteerTask = {
    url: string;
    itemId: string;
    proxy: proxyType;
    proxyUrl: string;
    fetchDomOnly: boolean;
    isXmlMode: boolean;
}

let cluster: Cluster
let counter = 0

const clusterOptions: any = {
    concurrency: ContextWithProxy,
    maxConcurrency: 4,
    puppeteerOptions: {
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
        proxyUrls: []
    }
}

let cachedCluster: CachedCluster

function initCachedCluster() {
    const cronString = '*/5 * * * *'
    const cronFunc = async () => {
        if (cachedCluster) {
            const current = moment()
            const updatedAt = moment(cachedCluster.updatedAt)

            const duration = moment.duration(current.diff(updatedAt))
            const seconds = duration.asSeconds()

            if (seconds > (60 * 10)) {
                console.log("closing the cluster, because it's unused for >10 minutes")
                await closeCluster()
            }
        }
    }
    const cronjob = new CronJob(cronString, cronFunc)
    cronjob.start()
}

async function handleEdgeCases(page: Page, url: string, resCode: number) {

    // Open all features in auto.ru
    const element = await page.$('.SpoilerLink_type_default')
    if (element) {
        await element.click()
    }

    if (url.includes('salidzini')) {
        await page.waitForSelector('div[itemtype="https://schema.org/Product"]')
        resCode = 200
        await sleep(1000)
    }
    // Mobile.de waiting challenge update .crypto sel is not present there
    let waitingChallengeSel = '#sec-cpt-if'
    let waitingChallenge = await page.$(waitingChallengeSel)
    let wasWaitingChallenge = waitingChallenge
    let waitingCounter = 0
    while (waitingChallenge) {
        waitingCounter++
        console.log("waiting challenge ", waitingCounter)
        await page.reload()
        await sleep(2000)

        try {
            waitingChallenge = await page.$(waitingChallengeSel)
        } catch (error) {
            Logger.warn({ error }, "waiting selector not found!")
        }

        if (waitingCounter > 3) {
            break
        }
    }

    if (wasWaitingChallenge) {
        // Allow full page to load
        await sleep(2000)
    }
    return resCode
}

async function launchCluster() {
    let timestamp = moment().format()
    if (cachedCluster) {
        console.log("using cached cluster!!!", cachedCluster.createdAt, cachedCluster.updatedAt)
        cluster = cachedCluster.cluster
        cachedCluster.updatedAt = timestamp
        return
    }
    cluster = await Cluster.launch(clusterOptions);
    cachedCluster = {
        cluster,
        createdAt: timestamp,
        updatedAt: timestamp
    }
}

async function setClusterTask(headers, cookies) {
    if (!cluster) {
        await launchCluster()
    }
    await cluster.task(async ({ page, data }) => {
        let response = await setPage(page, headers, cookies, data)
        return response
    });
}

async function executeTask(taskData: puppeteerTask) {
    let { ip, port } = taskData.proxy
    clusterOptions.puppeteerOptions.proxyUrls.push(`http://${ip}:${port}`)
    let { $, resCode } = await cluster.execute(taskData);
    return { $, resCode }
}

async function closeCluster() {
    await cluster.idle();
    await cluster.close();
    cluster = null
    cachedCluster = null
}

async function setPage(page: Page, headers, cookies, data: puppeteerTask) {

    let { url, itemId, proxy, fetchDomOnly, isXmlMode } = data
    let { username, password } = proxy

    await page.authenticate({
        username,
        password,
    })

    await page.setExtraHTTPHeaders(headers)
    if (cookies) {
        Logger.info({ url, itemId, cookies: JSON.stringify(cookies) }, "applying cookies")
        if (Array.isArray(cookies)) {
            await page.setCookie(...cookies)
        }
        else if (Object.keys(cookies).length) {
            await page.setCookie(cookies)
        }
    }

    let result, resCode
    try {
        // check if really behind a proxy, this is helpful when we are in windows pc locally
        // await page.goto('https://api.myip.com/')
        // console.log(await page.content());

        if (fetchDomOnly) {
            result = await page.goto(url, { waitUntil: 'domcontentloaded' })
            await sleep(2000)
        } else {
            result = await page.goto(url)
        }

        resCode = await handleEdgeCases(page, url, result.status())
        Logger.info({ url, itemId, resCode }, "success Puppeteer Request")
        const content = await page.content()
        const $ = cheerio.load(content, { xmlMode: isXmlMode })

        return { $, resCode }

    } catch (error) {
        let resCode = error.statusCode
        Logger.error({ url, itemId, resCode }, "error Puppeteer Request")
        throw {
            ...error, resCode, headless: true
        }
    }
}

initCachedCluster()

export {
    setClusterTask,
    executeTask,
    puppeteerTask
}