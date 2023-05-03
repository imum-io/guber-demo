import { red, cyan, magenta, green, yellow, } from 'colorette';
import pino from 'pino'
import { dbServers, envs } from '../../config/enums';
import _ from 'lodash'

export type ContextType = {
    // general must-haves
    vehicleType: string
    source: string
    dbServer: dbServers

    // product-specific must-haves
    sourceId: string
    url: string

    // For easier tracking
    process?: string
    scope?: string

    jobId?: string
    itemId?: string
    uuid?: string
    url2?: string
    linkId?: string
    countryCode?: string

    // Valuation tool purposes
    sheetNumber?: number
    sentEmail?: string
    inputFields?: any
}

type ProxyLogType = { host?: string, port?: string, rotation?: string }

const environment = process.env.ENV
const serverName = process.env.SERVER_NAME


// let context: ContextType = {};

let proxyLog: ProxyLogType = {};

function setProxyLog(prx: ProxyLogType) {
    proxyLog = prx
}

// function setContext(ctx: ContextType) {
//     context = ctx
// }

const devConfig = {
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            levelFirst: true,
            singleLine: false,
            translateTime: 'yyyy-dd-mm, h:MM:ss TT'
        },
    }
}

const prodConfig = {
    formatters: {
        level(level: string) {
            return { level };
        },
    },
}

const pinoConfig = environment == envs.local ? devConfig : prodConfig

const logger = pino(pinoConfig)


function info(data: object | string, message?: string) {
    if (typeof data == 'object') {
        logger.info({ ...data, serverName, environment, proxyLog }, cyan(message))
    }
    else {
        logger.info({ serverName, environment, message, proxyLog }, cyan(data))
    }
}

function warn(data: object | string, message?: string) {
    if (typeof data == 'object') {
        logger.warn({ ...data, serverName, environment, proxyLog }, yellow(message))
    }
    else {
        logger.warn({ serverName, environment, message, proxyLog }, yellow(data))
    }
}


function debug(data: object | string, message?: string) {
    if (typeof data == 'object') {
        logger.debug({ ...data, serverName, environment, proxyLog }, magenta(message))
    }
    else {
        logger.debug({ serverName, environment, message, proxyLog }, magenta(data))
    }
}

function error(data: object | string, message?: string) {
    if (typeof data == 'object') {
        logger.error({ ...data, serverName, environment, proxyLog }, red(message))
    }
    else {
        logger.error({ serverName, environment, message, proxyLog }, red(data))
    }
}

function print(message: string) {
    logger.info({ serverName, environment, proxyLog }, green(message))
}





const Logger = {
    error,
    info,
    debug,
    print,
    // setContext,
    setProxyLog,
    warn
}




export default Logger