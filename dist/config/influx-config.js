"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.password = exports.username = exports.bucket = exports.org = exports.token = exports.url = exports.analytics = void 0;
exports.analytics = process.env.INFLUX_ANALYTICS == "true";
exports.url = process.env.INFLUX_URL;
exports.token = process.env.INFLUX_TOKEN;
exports.org = process.env.INFLUX_ORG;
exports.bucket = process.env.INFLUX_BUCKET;
exports.username = process.env.INFLUX_USERNAME;
exports.password = process.env.INFLUX_PASSWORD;
//# sourceMappingURL=influx-config.js.map