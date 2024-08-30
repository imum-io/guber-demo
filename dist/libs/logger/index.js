"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const colorette_1 = require("colorette");
const pino_1 = __importDefault(require("pino"));
const enums_1 = require("../../config/enums");
const environment = process.env.ENV;
const serverName = process.env.SERVER_NAME;
// let context: ContextType = {};
let proxyLog = {};
function setProxyLog(prx) {
    proxyLog = prx;
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
};
const prodConfig = {
    formatters: {
        level(level) {
            return { level };
        },
    },
};
const pinoConfig = environment == enums_1.envs.local ? devConfig : prodConfig;
const logger = (0, pino_1.default)(pinoConfig);
function info(data, message) {
    if (typeof data == 'object') {
        logger.info(Object.assign(Object.assign({}, data), { serverName, environment, proxyLog }), (0, colorette_1.cyan)(message));
    }
    else {
        logger.info({ serverName, environment, message, proxyLog }, (0, colorette_1.cyan)(data));
    }
}
function warn(data, message) {
    if (typeof data == 'object') {
        logger.warn(Object.assign(Object.assign({}, data), { serverName, environment, proxyLog }), (0, colorette_1.yellow)(message));
    }
    else {
        logger.warn({ serverName, environment, message, proxyLog }, (0, colorette_1.yellow)(data));
    }
}
function debug(data, message) {
    if (typeof data == 'object') {
        logger.debug(Object.assign(Object.assign({}, data), { serverName, environment, proxyLog }), (0, colorette_1.magenta)(message));
    }
    else {
        logger.debug({ serverName, environment, message, proxyLog }, (0, colorette_1.magenta)(data));
    }
}
function error(data, message) {
    if (typeof data == 'object') {
        logger.error(Object.assign(Object.assign({}, data), { serverName, environment, proxyLog }), (0, colorette_1.red)(message));
    }
    else {
        logger.error({ serverName, environment, message, proxyLog }, (0, colorette_1.red)(data));
    }
}
function print(message) {
    logger.info({ serverName, environment, proxyLog }, (0, colorette_1.green)(message));
}
const Logger = {
    error,
    info,
    debug,
    print,
    // setContext,
    setProxyLog,
    warn
};
exports.default = Logger;
//# sourceMappingURL=index.js.map