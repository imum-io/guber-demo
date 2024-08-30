"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imsimToken = exports.imsimUrl = exports.unleashAppName = exports.unleashUrl = exports.unleashEnv = exports.unleashApiKey = exports.mitmPort = exports.mitmHost = exports.jwtSecret = exports.guberApiKey = exports.mailApiKey = exports.slackToken = exports.gptApiKey = exports.gptModel = exports.esEngineUrl = exports.esPrivateKey = exports.esSearchKey = exports.currentEnv = exports.serverName = exports.redisPass = exports.redisPort = exports.redisHost = exports.sshPassword = exports.sshUsername = exports.maxConcurrency = exports.supportedTypes = exports.mapboxToken = exports.minUpdatesToStop = exports.dcProxiesUrl = exports.dcProxyPassword = exports.dcProxyUsername = exports.password = exports.username = exports.dbPassword = exports.dbPort = exports.dbHost = exports.dbUser = exports.dbName = exports.isSaveHtml = exports.isSaveImages = exports.isProd = exports.dbOn = void 0;
const enums_1 = require("./enums");
const dotenv_1 = require("dotenv");
const Sentry = __importStar(require("@sentry/node"));
(0, dotenv_1.config)();
// Enable testing without DB at all, only with files
exports.dbOn = process.env.DB_ON == "true";
exports.isProd = process.env.IS_PROD == "true";
exports.isSaveImages = process.env.IS_SAVE_IMAGES == "true";
exports.isSaveHtml = process.env.IS_SAVE_HTML == "true";
exports.dbName = process.env.DB_NAME;
exports.dbUser = process.env.DB_USER;
exports.dbHost = process.env.DB_HOST || '127.0.0.1';
exports.dbPort = process.env.DB_PORT || '3306';
exports.dbPassword = process.env.DB_PASSWORD;
exports.username = process.env.USERNAME;
exports.password = process.env.PASSWORD;
exports.dcProxyUsername = process.env.DC_PROXY_USERNAME;
exports.dcProxyPassword = process.env.DC_PROXY_PASSWORD;
exports.dcProxiesUrl = process.env.DC_PROXY_URL;
exports.minUpdatesToStop = Number(process.env.MIN_UPDATE_TO_STOP) || -1; // If encountered < X, din't go to next page for the current link
exports.mapboxToken = process.env.MAP_BOX_TOKEN;
exports.supportedTypes = process.env.SUPPORTED_TYPES ? process.env.SUPPORTED_TYPES.split(",") : [enums_1.vehicleTypes.household];
exports.maxConcurrency = Number(process.env.MAX_CONCURRENCY) || 4;
exports.sshUsername = process.env.DB_SSH_USER;
exports.sshPassword = process.env.DB_SSH_PASSWORD;
exports.redisHost = process.env.REDIS_HOST;
exports.redisPort = Number(process.env.REDIS_PORT);
exports.redisPass = process.env.REDIS_PASS;
exports.serverName = process.env.SERVER_NAME;
exports.currentEnv = process.env.ENV;
exports.esSearchKey = process.env.ES_SEARCH_KEY;
exports.esPrivateKey = process.env.ES_PRIVATE_KEY;
exports.esEngineUrl = process.env.ES_ENGINE_URL;
exports.gptModel = process.env.GPT_MODEL;
exports.gptApiKey = process.env.GPT_API_KEY;
exports.slackToken = process.env.SLACK_TOKEN;
exports.mailApiKey = process.env.MAIL_API_KEY;
exports.guberApiKey = process.env.GUBER_API_KEY;
exports.jwtSecret = process.env.JWT_SECRET;
exports.mitmHost = process.env.MITM_HOST;
exports.mitmPort = process.env.MITM_PORT || 8900;
exports.unleashApiKey = process.env.UNLEASH_API_KEY;
exports.unleashEnv = process.env.UNLEASH_ENV;
exports.unleashUrl = process.env.UNLEASH_URL;
exports.unleashAppName = process.env.UNLEASH_APP_NAME;
exports.imsimUrl = process.env.IMSIM_URL;
exports.imsimToken = process.env.IMSIM_TOKEN;
const sentryDSN = process.env.SENTRY_DSN;
if (exports.currentEnv != enums_1.envs.local && sentryDSN) {
    // Don't send any crash reports if not production
    Sentry.init({ dsn: sentryDSN });
}
//# sourceMappingURL=index.js.map