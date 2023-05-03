import { startUnleash, Unleash } from 'unleash-client'
import { unleashApiKey, unleashAppName, unleashEnv, unleashUrl } from '../config'
import Logger from '../libs/logger'

let unleash: Unleash = null
let isInitiated = false

async function init() {
    if (isInitiated || !unleashUrl) {
        return
    }
    isInitiated = true
    const unleashConfig = {
        url: unleashUrl,
        appName: unleashAppName,
        environment: unleashEnv,
        customHeaders: { Authorization: unleashApiKey },
    }
    unleash = await startUnleash(unleashConfig)
    Logger.info(unleashConfig, 'before unleash is ready')
    unleash.on('ready', () => {
        Logger.info(unleashConfig, 'unleash is ready')
    })
}

export function useIntelligentScheduler() {
    return unleash?.isEnabled('intelligentScheduler')
}

export function shouldUpdateItems() {
    return unleash?.isEnabled('shouldUpdateItems')
}

init()
