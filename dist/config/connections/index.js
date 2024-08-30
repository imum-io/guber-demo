"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const enums_1 = require("../enums");
const local_config_json_1 = __importDefault(require("./local-config.json"));
const __1 = require("..");
// TODO load this from json file
const productionConfigs = local_config_json_1.default;
const developmentConfigs = local_config_json_1.default;
const localConfigs = local_config_json_1.default;
const loadConnections = () => {
    if (!__1.currentEnv) {
        console.log('Default environment set to development!');
    }
    let connection;
    const env = __1.currentEnv;
    switch (env) {
        case enums_1.envs.production:
            connection = productionConfigs;
            break;
        case enums_1.envs.development:
            connection = developmentConfigs;
            break;
        case enums_1.envs.local:
            connection = localConfigs;
            break;
        default:
            connection = developmentConfigs;
            break;
    }
    if (__1.currentEnv) {
        console.log(`${env} connection loaded, `, connection);
    }
    return connection;
};
const loadedConnections = loadConnections();
exports.default = loadedConnections;
//# sourceMappingURL=index.js.map