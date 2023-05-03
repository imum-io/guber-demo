import { envs, vehicleTypes } from './enums'
import { config } from 'dotenv'
import * as Sentry from '@sentry/node'

config()
// Enable testing without DB at all, only with files
export const dbOn = process.env.DB_ON == "true"
export const isProd = process.env.IS_PROD == "true"
export const isSaveImages = process.env.IS_SAVE_IMAGES == "true"
export const isSaveHtml = process.env.IS_SAVE_HTML == "true"
export const dbName = process.env.DB_NAME
export const dbUser = process.env.DB_USER
export const dbHost = process.env.DB_HOST || '127.0.0.1'
export const dbPort = process.env.DB_PORT || '3306'
export const dbPassword = process.env.DB_PASSWORD
export const username = process.env.USERNAME
export const password = process.env.PASSWORD
export const dcProxyUsername = process.env.DC_PROXY_USERNAME
export const dcProxyPassword = process.env.DC_PROXY_PASSWORD
export const dcProxiesUrl = process.env.DC_PROXY_URL
export const minUpdatesToStop = Number(process.env.MIN_UPDATE_TO_STOP) || -1 // If encountered < X, din't go to next page for the current link
export const mapboxToken = process.env.MAP_BOX_TOKEN
export const supportedTypes = process.env.SUPPORTED_TYPES ? process.env.SUPPORTED_TYPES.split(",") : [vehicleTypes.household]
export const maxConcurrency = Number(process.env.MAX_CONCURRENCY) || 4

export const sshUsername = process.env.DB_SSH_USER
export const sshPassword = process.env.DB_SSH_PASSWORD

export const redisHost = process.env.REDIS_HOST
export const redisPort = Number(process.env.REDIS_PORT)
export const redisPass = process.env.REDIS_PASS
export const serverName = process.env.SERVER_NAME
export const currentEnv = process.env.ENV

export const esSearchKey = process.env.ES_SEARCH_KEY
export const esPrivateKey = process.env.ES_PRIVATE_KEY
export const esEngineUrl = process.env.ES_ENGINE_URL

export const gptModel = process.env.GPT_MODEL
export const gptApiKey = process.env.GPT_API_KEY

export const slackToken = process.env.SLACK_TOKEN
export const mailApiKey = process.env.MAIL_API_KEY
export const guberApiKey = process.env.GUBER_API_KEY
export const jwtSecret = process.env.JWT_SECRET

export const mitmHost = process.env.MITM_HOST
export const mitmPort = process.env.MITM_PORT || 8900

export const unleashApiKey = process.env.UNLEASH_API_KEY
export const unleashEnv = process.env.UNLEASH_ENV
export const unleashUrl = process.env.UNLEASH_URL
export const unleashAppName = process.env.UNLEASH_APP_NAME

export const imsimUrl = process.env.IMSIM_URL
export const imsimToken = process.env.IMSIM_TOKEN

const sentryDSN = process.env.SENTRY_DSN
if (currentEnv != envs.local && sentryDSN) {
    // Don't send any crash reports if not production
    Sentry.init({ dsn: sentryDSN })
}
