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
exports.executeTask = exports.setClusterTask = void 0;
const cheerio_1 = __importDefault(require("cheerio"));
const utils_1 = require("../../utils");
const puppeteer_cluster_1 = require("puppeteer-cluster");
const context_with_proxy_1 = __importDefault(require("./context-with-proxy"));
const moment_1 = __importDefault(require("moment"));
const cron_1 = require("cron");
const logger_1 = __importDefault(require("../logger"));
let cluster;
let counter = 0;
const clusterOptions = {
    concurrency: context_with_proxy_1.default,
    maxConcurrency: 4,
    puppeteerOptions: {
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
        proxyUrls: []
    }
};
let cachedCluster;
function initCachedCluster() {
    const cronString = '*/5 * * * *';
    const cronFunc = () => __awaiter(this, void 0, void 0, function* () {
        if (cachedCluster) {
            const current = (0, moment_1.default)();
            const updatedAt = (0, moment_1.default)(cachedCluster.updatedAt);
            const duration = moment_1.default.duration(current.diff(updatedAt));
            const seconds = duration.asSeconds();
            if (seconds > (60 * 10)) {
                console.log("closing the cluster, because it's unused for >10 minutes");
                yield closeCluster();
            }
        }
    });
    const cronjob = new cron_1.CronJob(cronString, cronFunc);
    cronjob.start();
}
function handleEdgeCases(page, url, resCode) {
    return __awaiter(this, void 0, void 0, function* () {
        // Open all features in auto.ru
        const element = yield page.$('.SpoilerLink_type_default');
        if (element) {
            yield element.click();
        }
        if (url.includes('salidzini')) {
            yield page.waitForSelector('div[itemtype="https://schema.org/Product"]');
            resCode = 200;
            yield (0, utils_1.sleep)(1000);
        }
        // Mobile.de waiting challenge update .crypto sel is not present there
        let waitingChallengeSel = '#sec-cpt-if';
        let waitingChallenge = yield page.$(waitingChallengeSel);
        let wasWaitingChallenge = waitingChallenge;
        let waitingCounter = 0;
        while (waitingChallenge) {
            waitingCounter++;
            console.log("waiting challenge ", waitingCounter);
            yield page.reload();
            yield (0, utils_1.sleep)(2000);
            try {
                waitingChallenge = yield page.$(waitingChallengeSel);
            }
            catch (error) {
                logger_1.default.warn({ error }, "waiting selector not found!");
            }
            if (waitingCounter > 3) {
                break;
            }
        }
        if (wasWaitingChallenge) {
            // Allow full page to load
            yield (0, utils_1.sleep)(2000);
        }
        return resCode;
    });
}
function launchCluster() {
    return __awaiter(this, void 0, void 0, function* () {
        let timestamp = (0, moment_1.default)().format();
        if (cachedCluster) {
            console.log("using cached cluster!!!", cachedCluster.createdAt, cachedCluster.updatedAt);
            cluster = cachedCluster.cluster;
            cachedCluster.updatedAt = timestamp;
            return;
        }
        cluster = yield puppeteer_cluster_1.Cluster.launch(clusterOptions);
        cachedCluster = {
            cluster,
            createdAt: timestamp,
            updatedAt: timestamp
        };
    });
}
function setClusterTask(headers, cookies) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!cluster) {
            yield launchCluster();
        }
        yield cluster.task(({ page, data }) => __awaiter(this, void 0, void 0, function* () {
            let response = yield setPage(page, headers, cookies, data);
            return response;
        }));
    });
}
exports.setClusterTask = setClusterTask;
function executeTask(taskData) {
    return __awaiter(this, void 0, void 0, function* () {
        let { ip, port } = taskData.proxy;
        clusterOptions.puppeteerOptions.proxyUrls.push(`http://${ip}:${port}`);
        let { $, resCode } = yield cluster.execute(taskData);
        return { $, resCode };
    });
}
exports.executeTask = executeTask;
function closeCluster() {
    return __awaiter(this, void 0, void 0, function* () {
        yield cluster.idle();
        yield cluster.close();
        cluster = null;
        cachedCluster = null;
    });
}
function setPage(page, headers, cookies, data) {
    return __awaiter(this, void 0, void 0, function* () {
        let { url, itemId, proxy, fetchDomOnly, isXmlMode } = data;
        let { username, password } = proxy;
        yield page.authenticate({
            username,
            password,
        });
        yield page.setExtraHTTPHeaders(headers);
        if (cookies) {
            logger_1.default.info({ url, itemId, cookies: JSON.stringify(cookies) }, "applying cookies");
            if (Array.isArray(cookies)) {
                yield page.setCookie(...cookies);
            }
            else if (Object.keys(cookies).length) {
                yield page.setCookie(cookies);
            }
        }
        let result, resCode;
        try {
            // check if really behind a proxy, this is helpful when we are in windows pc locally
            // await page.goto('https://api.myip.com/')
            // console.log(await page.content());
            if (fetchDomOnly) {
                result = yield page.goto(url, { waitUntil: 'domcontentloaded' });
                yield (0, utils_1.sleep)(2000);
            }
            else {
                result = yield page.goto(url);
            }
            resCode = yield handleEdgeCases(page, url, result.status());
            logger_1.default.info({ url, itemId, resCode }, "success Puppeteer Request");
            const content = yield page.content();
            const $ = cheerio_1.default.load(content, { xmlMode: isXmlMode });
            return { $, resCode };
        }
        catch (error) {
            let resCode = error.statusCode;
            logger_1.default.error({ url, itemId, resCode }, "error Puppeteer Request");
            throw Object.assign(Object.assign({}, error), { resCode, headless: true });
        }
    });
}
initCachedCluster();
//# sourceMappingURL=puppeteer-request.js.map