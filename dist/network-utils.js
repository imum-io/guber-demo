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
exports.getProxy = exports.withRetries = exports.setADefaultProxy = exports.setDatacenterProxies = exports.request = exports.getUrl = exports.getResponseWithOptions = exports.getJsonLegacy = exports.getJson = exports.getHTML = void 0;
const config_1 = require("./config");
const cheerio_1 = __importDefault(require("cheerio"));
const request_promise_1 = __importDefault(require("request-promise"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const https_proxy_agent_1 = __importDefault(require("https-proxy-agent"));
const xml_js_1 = __importDefault(require("xml-js"));
const puppeteer_request_1 = require("./libs/cluster/puppeteer-request");
const tough_cookie_1 = __importDefault(require("tough-cookie"));
const axios_1 = __importDefault(require("axios"));
const proxys_json_1 = require("./config/proxys.json");
const logger_1 = __importDefault(require("./libs/logger"));
const enums_1 = require("./config/enums");
const sources_1 = require("./sites/sources");
let dcProxiesArray = proxys_json_1.proxies;
let datacenterProxies = [];
let oxylabProxies = [];
let webshareProxies = [];
let proxyRotationCounter = 0;
/**
 * It takes a URL, headers, and cookies, and returns an object that can be passed to the
 * `request-promise` library
 * @param url - the url to be requested
 * @param headers - This is the header object that will be passed to the request.
 * @param [cookies] - this is an object that contains the cookies that you want to pass to the request.
 * @returns A function that returns an object
 */
function getOptions(url, headers, cookies) {
    headers = Object.assign(Object.assign({}, headers), { 
        // 'User-Agent': 'mobile.de_iPhone_de/7.12.0',
        // 'Connection': 'keep-alive',
        // 'User-Agent': 'Rested/2009 CFNetwork/902.1 Darwin/17.7.0 (x86_64)',
        // TODO: ability to dynamically use user-agent passed from portal-specific interfaces
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36', 'Accept-Language': 'en-us' });
    let cookieObject = {
        uri: url,
        headers,
        resolveWithFullResponse: true,
    };
    if (cookies && Object.keys(cookies).length > 0) {
        let cookie = new tough_cookie_1.default.Cookie(cookies);
        var cookiejar = request_promise_1.default.jar();
        cookiejar.setCookie(cookie.toString(), url);
        cookieObject.jar = cookiejar;
    }
    return cookieObject;
}
/**
 * It sets the datacenterProxies variable to a list of proxies
 * @returns An array of proxy objects.
 */
function setDatacenterProxies(fetchDynamicProxies = false) {
    return __awaiter(this, void 0, void 0, function* () {
        if (datacenterProxies && datacenterProxies.length) {
            return;
        }
        oxylabProxies = setupDefaultProxies();
        webshareProxies = [];
        if (config_1.currentEnv != enums_1.envs.local && fetchDynamicProxies) {
            try {
                const dcProxiesResponse = yield (0, request_promise_1.default)({
                    uri: config_1.dcProxiesUrl, auth: {
                        user: config_1.dcProxyUsername,
                        pass: config_1.dcProxyPassword,
                    }
                });
                oxylabProxies = JSON.parse(dcProxiesResponse).map(proxy => {
                    return Object.assign(Object.assign({}, proxy), { username: config_1.dcProxyUsername, password: config_1.dcProxyPassword });
                });
            }
            catch (error) {
                console.log("Can't access remote proxy list. Using local");
            }
        }
        datacenterProxies = [...oxylabProxies, ...webshareProxies];
    });
}
exports.setDatacenterProxies = setDatacenterProxies;
function getProxyPool(source, retries) {
    let proxyProvider;
    if (source == sources_1.sources.MDE) {
        proxyProvider = 'oxyLab';
    }
    let proxiesPool = [];
    if (proxyProvider == 'webShare') {
        proxiesPool = webshareProxies;
    }
    else if (proxyProvider == 'oxyLab' || retries >= 2) {
        proxiesPool = oxylabProxies;
    }
    else {
        proxiesPool = datacenterProxies;
    }
    return proxiesPool;
}
function getProxy(proxyConfig = {}) {
    let { source, itemId, retries } = proxyConfig;
    let proxiesPool = getProxyPool(source, retries);
    let proxyId;
    if (itemId == null || itemId == undefined || retries == null || retries == undefined) {
        proxyRotationCounter++;
        if (proxyRotationCounter >= proxiesPool.length) {
            proxyRotationCounter = 0;
        }
        proxyId = proxyRotationCounter;
    }
    else {
        proxyId = (Number(itemId) + retries) % proxiesPool.length;
    }
    let proxy = proxiesPool[proxyId];
    let proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.ip}:${proxy.port}`;
    logger_1.default.info({ scope: 'getProxy', itemId, retries }, `[PROXY]-> (${proxyId}/${proxiesPool.length}) host: ${proxy.ip} port: ${proxy.port} retries: ${retries}`);
    logger_1.default.setProxyLog({
        host: proxy.ip,
        port: proxy.port,
        rotation: `${proxyId}/${datacenterProxies.length}`,
    });
    return { proxyUrl, proxy };
}
exports.getProxy = getProxy;
/**
 * It takes a URI, makes a request to it, and returns the response as a JSON object
 * @param uri - The URL to request
 * @returns A promise that resolves to a JSON object.
 */
function request(uri) {
    return (0, request_promise_1.default)({
        uri, maxRedirects: 100,
        followRedirect: false,
        simple: false
    })
        .then(response => {
        try {
            return JSON.parse(response);
        }
        catch (error) {
            return JSON.parse(xml_js_1.default.xml2json(response, { compact: true, spaces: 4 }));
        }
    });
}
exports.request = request;
/**
 * It takes a URL, and returns a fetch request with a custom user agent and a proxy
 * @param url - The URL to fetch
 * @returns A promise
 */
function getUrl(url, proxyConfigs) {
    let { proxyUrl } = getProxy(proxyConfigs);
    return (0, node_fetch_1.default)(url, {
        // headers: headers,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
        },
        timeout: 15000,
        agent: (0, https_proxy_agent_1.default)(proxyUrl),
    });
}
exports.getUrl = getUrl;
/**
 * It takes a URL, an options object, and a boolean value. If the boolean value is true, it will use a
 * proxy to make the request. If the boolean value is false, it will not use a proxy
 * @param url - The url to fetch
 * @param options - This is the options object that you would pass to the fetch function.
 * @param [returnJson=true] - true/false - whether to return json or html
 */
function getResponseWithOptions(url, options, returnJson = true, proxyConfig) {
    let resCode;
    let { proxyUrl, proxy } = getProxy(proxyConfig);
    options.agent = (0, https_proxy_agent_1.default)(proxyUrl);
    return (0, node_fetch_1.default)(url, options)
        .then(res => {
        resCode = res.status;
        return returnJson ? res.json() : res.text();
    })
        .then(res => {
        return {
            data: res,
            resCode,
            proxy
        };
    });
}
exports.getResponseWithOptions = getResponseWithOptions;
/**
 * It makes a GET request to the given URL, and returns the response as JSON
 * @param {string} url - The URL to fetch
 * @param headers - This is the headers that will be sent with the request.
 * @param [withProxy=true] - If you want to use a proxy, set this to true.
 * @param [mitm=false] - If you want to use mitmproxy to intercept the request, set this to true.
 * @returns The response is being returned as a generic type T.
 */
function getJson(url, headers = {}, mitm = false, proxyConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        headers = Object.assign({ 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36' }, headers);
        const response = yield getJSONWithOptions(url, headers, mitm, proxyConfig);
        return response;
    });
}
exports.getJson = getJson;
/**
 * It takes a URL, some headers, a boolean to indicate whether to use a proxy, and a boolean to
 * indicate whether to use a MITM proxy, and returns the JSON data and the response code
 * @param {string} url - The URL to fetch
 * @param headers - The headers to be sent with the request.
 * @param {boolean} withProxy - boolean - whether to use a proxy or not
 * @param {boolean} mitm - boolean - whether to use mitmproxy or not
 * @returns The data and the response code
 */
function getJSONWithOptions(url, headers, mitm, proxyConfig) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        let options = {
            headers,
        };
        let proxy, proxyInfo;
        if (mitm) {
            let mitmProxy = getProxy(proxyConfig);
            // mitm should be run with concurrency 1 always, otherwise this setMitmOptions won't work
            proxy = mitmProxy.proxy;
            proxyInfo = yield setMitmOptions(proxy);
        }
        else {
            let axiosProxy = getAxiosProxy(proxyConfig);
            proxy = axiosProxy.proxy;
            proxyInfo = axiosProxy.proxyInfo;
        }
        options.proxy = proxyInfo;
        try {
            const { data, status } = yield axios_1.default.get(url, options);
            return { data, resCode: status, proxy };
        }
        catch (error) {
            let statusCode = (_a = error.response) === null || _a === void 0 ? void 0 : _a.status;
            let data = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data;
            logger_1.default.error({ url, itemId: proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.itemId }, "error getJSONWithOptions " + statusCode);
            throw {
                data,
                statusCode,
                message: "getJSONWithOptions error " + statusCode,
                proxy
            };
        }
    });
}
function setMitmOptions(proxy) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let mode = [`upstream:http://${proxy.ip}:${proxy.port}`];
            let upstream_auth = `${proxy.username}:${proxy.password}`;
            let request = {
                mode, upstream_auth
            };
            let response = yield (0, node_fetch_1.default)(`http://${config_1.mitmHost}:8081/options`, {
                headers: {
                    "accept": "*/*",
                    "accept-language": "en-US,en;q=0.9",
                    "content-type": "application/json",
                    "Cookie": "_xsrf=2|01cae2fa|8e6bf0f1f0eba117fece7ee76bf6720f|1671085181",
                    "x-xsrftoken": "2|01cae2fa|8e6bf0f1f0eba117fece7ee76bf6720f|1671085181"
                },
                body: JSON.stringify(request),
                method: "PUT"
            });
        }
        catch (error) {
            logger_1.default.error(proxy, "MITM proxy setup was not successful");
        }
        let proxyInfo = { host: config_1.mitmHost, port: Number(config_1.mitmPort) };
        return proxyInfo;
    });
}
/**
 * It returns a proxy object for the axios library.
 * @returns An object with the following properties:
 *     host: The hostname of the proxy server
 *     port: The port number of the proxy server
 *     auth: An object with the following properties:
 *         username: The username to use for proxy authentication
 *         password: The password to use for proxy authentication
 */
function getAxiosProxy(proxyConfig) {
    let { proxy } = getProxy(proxyConfig);
    let proxyInfo = {
        host: proxy.ip,
        port: Number(proxy.port),
        auth: {
            username: proxy.username,
            password: proxy.password,
        }
    };
    return { proxy, proxyInfo };
}
/**
 * A function that returns a promise.
 * @param url - the url to fetch
 * @param headers - This is the headers that will be sent with the request.
 * @param [withProxy=true] - true/false, whether to use a proxy or not
 * @returns The data from the response.
 */
function getJsonLegacy(url, headers = {}, withProxy = true) {
    let options = {
        method: 'get',
        // headers: headers,
        headers: Object.assign({ 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36' }, headers),
    };
    return getResponseWithOptions(url, options, true).then(res => res.data);
}
exports.getJsonLegacy = getJsonLegacy;
/**
 * It takes an async function, and a set of parameters, and retries the function up to a maximum number
 * of times, with a delay between each retry
 * @param asyncFunc - the function you want to run
 * @param params - the parameters to pass to the async function
 * @param [maxRetries=3] - The number of times to retry the function before giving up.
 * @param [withProxy=true] - if true, will use a proxy for the request
 */
function withRetries(asyncFunc, params, maxRetries = 3, withProxy = true) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("stuff", asyncFunc.name);
        let result = null;
        for (let i = 0; i < maxRetries; i++) {
            try {
                if (Array.isArray(params)) {
                    result = yield asyncFunc(...params);
                }
                else {
                    result = yield asyncFunc(params);
                }
                break;
            }
            catch (e) {
                console.log(i, " error for ", asyncFunc.name, e);
            }
        }
        return result;
    });
}
exports.withRetries = withRetries;
/**
 * It gets the HTML of a page
 * @param url - the url to get the html from
 * @param headers - the headers to use for the request
 * @param useHeadless - boolean, if true, the request will be made using a headless browser
 * @param cookies - the cookies to use for the request
 * @param imageId - the image id of the headless browser to use
 * @param forPage - boolean, if true, the request will be made through a proxy
 * @param [xmlMode=false] - if the page is an XML page, set this to true
 * @param [itemId] - the id of the item we're scraping
 * @param [domOnly=false] - uses waitUntil: 'domcontentloaded' option in puppeteer
 */
function getHTML(url, configs, proxyConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        let { headers, useHeadless, cookies, isXmlMode, fetchDomOnly } = configs;
        let itemId = proxyConfig === null || proxyConfig === void 0 ? void 0 : proxyConfig.itemId;
        let $, resCode;
        let { proxyUrl, proxy } = getProxy(proxyConfig);
        try {
            if (useHeadless) {
                yield (0, puppeteer_request_1.setClusterTask)(headers, cookies);
                const taskData = {
                    itemId, url, proxyUrl, proxy, fetchDomOnly, isXmlMode
                };
                const headlessRes = yield (0, puppeteer_request_1.executeTask)(taskData);
                $ = headlessRes.$;
                resCode = headlessRes.resCode;
            }
            else {
                const options = getOptions(url, headers, cookies);
                let rpToUse = request_promise_1.default.defaults({
                    proxy: proxyUrl,
                    strictSSL: false
                });
                if (!rpToUse) {
                    console.log("no getDatacenterProxy");
                    rpToUse = request_promise_1.default;
                }
                const httpRes = yield rpToUse(options);
                $ = cheerio_1.default.load(httpRes.body, { xmlMode: isXmlMode });
                resCode = httpRes.statusCode;
            }
            logger_1.default.info({ url, itemId, resCode }, "success getHtml");
            return { $, resCode, proxy };
        }
        catch (error) {
            let resCode = error.statusCode;
            logger_1.default.error({ url, itemId, resCode }, "error getHtml");
            let message = `http getHTML error ${resCode}`;
            if (error.headless) {
                message = `headless getHTML error ${resCode}`;
            }
            throw {
                resCode,
                $: error.error ? cheerio_1.default.load(error.error, { xmlMode: isXmlMode }) : undefined,
                message,
                proxy
            };
        }
    });
}
exports.getHTML = getHTML;
// this function should only be used for local testing purpose
function setADefaultProxy(defaultProxy, proxyProvider) {
    if (proxyProvider == 'oxyLab') {
        oxylabProxies = [defaultProxy];
    }
    else if (proxyProvider == 'webShare') {
        webshareProxies = [defaultProxy];
    }
    else {
        datacenterProxies = [defaultProxy];
    }
}
exports.setADefaultProxy = setADefaultProxy;
/**
 * It takes an array of IP addresses and returns an array of objects with the IP addresses as the `ip`
 * property
 * @returns An array of objects.
 */
function setupDefaultProxies() {
    let dcProxies = dcProxiesArray.map(ip => {
        return {
            ip,
            port: "60000",
            country: "LT",
            city: "Vilnius",
            username: config_1.dcProxyUsername,
            password: config_1.dcProxyPassword,
        };
    });
    return dcProxies;
}
//# sourceMappingURL=network-utils.js.map