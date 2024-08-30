"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldUpdateItems = exports.useIntelligentScheduler = void 0;
const unleash_client_1 = require("unleash-client");
const config_1 = require("../config");
const logger_1 = __importDefault(require("../libs/logger"));
let unleash = null;
let isInitiated = false;
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        if (isInitiated || !config_1.unleashUrl) {
            return;
        }
        isInitiated = true;
        const unleashConfig = {
            url: config_1.unleashUrl,
            appName: config_1.unleashAppName,
            environment: config_1.unleashEnv,
            customHeaders: { Authorization: config_1.unleashApiKey },
        };
        unleash = yield (0, unleash_client_1.startUnleash)(unleashConfig);
        logger_1.default.info(unleashConfig, 'before unleash is ready');
        unleash.on('ready', () => {
            logger_1.default.info(unleashConfig, 'unleash is ready');
        });
    });
}
function useIntelligentScheduler() {
    return unleash === null || unleash === void 0 ? void 0 : unleash.isEnabled('intelligentScheduler');
}
exports.useIntelligentScheduler = useIntelligentScheduler;
function shouldUpdateItems() {
    return unleash === null || unleash === void 0 ? void 0 : unleash.isEnabled('shouldUpdateItems');
}
exports.shouldUpdateItems = shouldUpdateItems;
init();
//# sourceMappingURL=features.js.map