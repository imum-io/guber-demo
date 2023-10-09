import { username, password, dcProxyUsername, dcProxyPassword, dcProxiesUrl, currentEnv, mitmHost, mitmPort } from './config'
import cheerio from 'cheerio'
import rp from 'request-promise'
import fetch from 'node-fetch'
import HttpsProxyAgent from 'https-proxy-agent'
import convert from 'xml-js'
import { executeTask, puppeteerTask, setClusterTask } from './libs/cluster/puppeteer-request'
import tough from 'tough-cookie'
import axios, { AxiosProxyConfig, AxiosRequestConfig } from 'axios'
import _ from 'lodash'
import { proxies } from './config/proxys.json'
import Logger from './libs/logger'
import { envs } from './config/enums'
import { proxyType, sourceFunctionConfig } from './types/common'
import { sources } from './sites/sources'

let dcProxiesArray = proxies
let datacenterProxies = []
let oxylabProxies = []
let webshareProxies = []

let proxyRotationCounter = 0

type proxyProvider = 'oxyLab' | 'webShare'
type proxyConfig = { source?: string; itemId?: string; retries?: number; }

/**
 * It takes a URL, headers, and cookies, and returns an object that can be passed to the
 * `request-promise` library
 * @param url - the url to be requested
 * @param headers - This is the header object that will be passed to the request.
 * @param [cookies] - this is an object that contains the cookies that you want to pass to the request.
 * @returns A function that returns an object
 */
function getOptions(url, headers, cookies?) {
    headers = {
        ...headers,
        // 'User-Agent': 'mobile.de_iPhone_de/7.12.0',
        // 'Connection': 'keep-alive',
        // 'User-Agent': 'Rested/2009 CFNetwork/902.1 Darwin/17.7.0 (x86_64)',
        // TODO: ability to dynamically use user-agent passed from portal-specific interfaces
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
        'Accept-Language': 'en-us',
    }

    let cookieObject: any = {
        uri: url,
        headers,
        resolveWithFullResponse: true,
    }
    if (cookies && Object.keys(cookies).length > 0) {
        let cookie = new tough.Cookie(cookies);

        var cookiejar = rp.jar();
        cookiejar.setCookie(cookie.toString(), url);

        cookieObject.jar = cookiejar;
    }
    return cookieObject

}

/**
 * It sets the datacenterProxies variable to a list of proxies
 * @returns An array of proxy objects.
 */
async function setDatacenterProxies(fetchDynamicProxies = false) {
    if (datacenterProxies && datacenterProxies.length) {
        return
    }
    oxylabProxies = setupDefaultProxies()
    webshareProxies = []

    if (currentEnv != envs.local && fetchDynamicProxies) {
        try {

            const dcProxiesResponse = await rp({
                uri: dcProxiesUrl, auth: {
                    user: dcProxyUsername,
                    pass: dcProxyPassword,
                }
            })
            oxylabProxies = JSON.parse(dcProxiesResponse).map(proxy => {
                return { ...proxy, username: dcProxyUsername, password: dcProxyPassword }
            })

        }
        catch (error) {
            console.log("Can't access remote proxy list. Using local")
        }
    }
    datacenterProxies = [...oxylabProxies, ...webshareProxies]
}

function getProxyPool(source, retries) {
    let proxyProvider: proxyProvider
    if (
        source == sources.MDE
    ) {
        proxyProvider = 'oxyLab'
    }
    let proxiesPool = []
    if (proxyProvider == 'webShare') {
        proxiesPool = webshareProxies
    } else if (proxyProvider == 'oxyLab' || retries >= 2) {
        proxiesPool = oxylabProxies
    } else {
        proxiesPool = datacenterProxies
    }
    return proxiesPool
}

function getProxy(proxyConfig: proxyConfig = {}) {
    let { source, itemId, retries } = proxyConfig

    let proxiesPool = getProxyPool(source, retries)
    let proxyId: number
    if (itemId == null || itemId == undefined || retries == null || retries == undefined) {
        proxyRotationCounter++
        if (proxyRotationCounter >= proxiesPool.length) {
            proxyRotationCounter = 0
        }
        proxyId = proxyRotationCounter
    } else {
        proxyId = (Number(itemId) + retries) % proxiesPool.length
    }

    let proxy: proxyType = proxiesPool[proxyId]
    let proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.ip}:${proxy.port}`

    Logger.info({ scope: 'getProxy', itemId, retries }, `[PROXY]-> (${proxyId}/${proxiesPool.length}) host: ${proxy.ip} port: ${proxy.port} retries: ${retries}`)


    Logger.setProxyLog({
        host: proxy.ip,
        port: proxy.port,
        rotation: `${proxyId}/${datacenterProxies.length}`,
    })

    return { proxyUrl, proxy }
}

/**
 * It takes a URI, makes a request to it, and returns the response as a JSON object
 * @param uri - The URL to request
 * @returns A promise that resolves to a JSON object.
 */
function request(uri) {
    return rp({
        uri, maxRedirects: 100,
        followRedirect: false,
        simple: false
    })
        .then(response => {
            try {
                return JSON.parse(response)
            }
            catch (error) {
                return JSON.parse(convert.xml2json(response, { compact: true, spaces: 4 }))
            }
        })
}

/**
 * It takes a URL, and returns a fetch request with a custom user agent and a proxy
 * @param url - The URL to fetch
 * @returns A promise
 */
function getUrl(url: string, proxyConfigs?: proxyConfig) {

    let { proxyUrl } = getProxy(proxyConfigs)
    return fetch(url, {
        // headers: headers,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
        },
        timeout: 15000,
        agent: HttpsProxyAgent(proxyUrl),
    })
}

/**
 * It takes a URL, an options object, and a boolean value. If the boolean value is true, it will use a
 * proxy to make the request. If the boolean value is false, it will not use a proxy
 * @param url - The url to fetch
 * @param options - This is the options object that you would pass to the fetch function.
 * @param [returnJson=true] - true/false - whether to return json or html
 */
function getResponseWithOptions(url, options, returnJson = true, proxyConfig?: proxyConfig) {
    let resCode
    let { proxyUrl, proxy } = getProxy(proxyConfig)
    options.agent = HttpsProxyAgent(proxyUrl)
    return fetch(url, options)
        .then(res => {
            resCode = res.status
            return returnJson ? res.json() : res.text()
        })
        .then(res => {
            return {
                data: res,
                resCode,
                proxy
            }
        })
}

/**
 * It makes a GET request to the given URL, and returns the response as JSON
 * @param {string} url - The URL to fetch
 * @param headers - This is the headers that will be sent with the request.
 * @param [withProxy=true] - If you want to use a proxy, set this to true.
 * @param [mitm=false] - If you want to use mitmproxy to intercept the request, set this to true.
 * @returns The response is being returned as a generic type T.
 */
async function getJson<T = any>(url: string, headers = {}, mitm = false, proxyConfig?: proxyConfig): Promise<T> {
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
        ...headers,
    }
    const response: any = await getJSONWithOptions(url, headers, mitm, proxyConfig)

    return response as T
}

/**
 * It takes a URL, some headers, a boolean to indicate whether to use a proxy, and a boolean to
 * indicate whether to use a MITM proxy, and returns the JSON data and the response code
 * @param {string} url - The URL to fetch
 * @param headers - The headers to be sent with the request.
 * @param {boolean} withProxy - boolean - whether to use a proxy or not
 * @param {boolean} mitm - boolean - whether to use mitmproxy or not
 * @returns The data and the response code
 */
async function getJSONWithOptions(url: string, headers, mitm: boolean, proxyConfig?: proxyConfig) {
    let options: AxiosRequestConfig = {
        headers,
    }
    let proxy, proxyInfo
    if (mitm) {
        let mitmProxy = getProxy(proxyConfig)
        // mitm should be run with concurrency 1 always, otherwise this setMitmOptions won't work
        proxy = mitmProxy.proxy
        proxyInfo = await setMitmOptions(proxy)
    } else {
        let axiosProxy = getAxiosProxy(proxyConfig)
        proxy = axiosProxy.proxy
        proxyInfo = axiosProxy.proxyInfo
    }
    options.proxy = proxyInfo

    try {
        const { data, status } = await axios.get(url, options)
        return { data, resCode: status, proxy }
    } catch (error) {
        let statusCode = error.response?.status
        let data = error.response?.data
        Logger.error({ url, itemId: proxyConfig?.itemId }, "error getJSONWithOptions " + statusCode)
        throw {
            data,
            statusCode,
            message: "getJSONWithOptions error " + statusCode,
            proxy
        }
    }
}

async function setMitmOptions(proxy: proxyType) {
    try {
        let mode = [`upstream:http://${proxy.ip}:${proxy.port}`]
        let upstream_auth = `${proxy.username}:${proxy.password}`
        let request = {
            mode, upstream_auth
        }
        let response = await fetch(`http://${mitmHost}:8081/options`, {
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
    } catch (error) {
        Logger.error(proxy, "MITM proxy setup was not successful")
    }
    let proxyInfo = { host: mitmHost, port: Number(mitmPort) }

    return proxyInfo
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
function getAxiosProxy(proxyConfig?: proxyConfig): { proxy: proxyType, proxyInfo: AxiosProxyConfig } {

    let { proxy } = getProxy(proxyConfig)

    let proxyInfo: AxiosProxyConfig = {
        host: proxy.ip,
        port: Number(proxy.port),
        auth: {
            username: proxy.username,
            password: proxy.password,
        }
    }

    return { proxy, proxyInfo }
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
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
            ...headers,
        },
    }

    return getResponseWithOptions(url, options, true).then(res => res.data)
}

/**
 * It takes an async function, and a set of parameters, and retries the function up to a maximum number
 * of times, with a delay between each retry
 * @param asyncFunc - the function you want to run
 * @param params - the parameters to pass to the async function
 * @param [maxRetries=3] - The number of times to retry the function before giving up.
 * @param [withProxy=true] - if true, will use a proxy for the request
 */
async function withRetries(asyncFunc, params, maxRetries = 3, withProxy = true) {
    console.log("stuff", asyncFunc.name)
    let result = null
    for (let i = 0; i < maxRetries; i++) {
        try {
            if (Array.isArray(params)) {
                result = await asyncFunc(...params)
            }
            else {
                result = await asyncFunc(params)
            }

            break
        }
        catch (e) {
            console.log(i, " error for ", asyncFunc.name, e)
        }
    }
    return result
}

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

async function getHTML(url, configs: sourceFunctionConfig, proxyConfig?: proxyConfig) {
    let { headers, useHeadless, cookies, isXmlMode, fetchDomOnly } = configs
    let itemId = proxyConfig?.itemId
    let $, resCode
    let { proxyUrl, proxy } = getProxy(proxyConfig)
    try {
        if (useHeadless) {
            await setClusterTask(headers, cookies)
            const taskData: puppeteerTask = {
                itemId, url, proxyUrl, proxy, fetchDomOnly, isXmlMode
            }
            const headlessRes = await executeTask(taskData)
            $ = headlessRes.$
            resCode = headlessRes.resCode
        } else {
            const options = getOptions(url, headers, cookies)

            let rpToUse = rp.defaults({
                proxy: proxyUrl,
                strictSSL: false
            })
            if (!rpToUse) {
                console.log("no getDatacenterProxy")
                rpToUse = rp
            }

            const httpRes = await rpToUse(options)
            $ = cheerio.load(httpRes.body, { xmlMode: isXmlMode })
            resCode = httpRes.statusCode
        }
        Logger.info({ url, itemId, resCode }, "success getHtml")
        return { $, resCode, proxy }
    } catch (error) {
        console.log("error", error);
        
        let resCode = error.statusCode
        Logger.error({ url, itemId, resCode }, "error getHtml")
        let message = `http getHTML error ${resCode}`
        if (error.headless) {
            message = `headless getHTML error ${resCode}`
        }
        throw {
            resCode,
            $: error.error ? cheerio.load(error.error, { xmlMode: isXmlMode }) : undefined,
            message,
            proxy
        }
    }
}

// this function should only be used for local testing purpose
function setADefaultProxy(defaultProxy: proxyType, proxyProvider: proxyProvider): void {
    if (proxyProvider == 'oxyLab') {
        oxylabProxies = [defaultProxy]
    } else if (proxyProvider == 'webShare') {
        webshareProxies = [defaultProxy]
    } else {
        datacenterProxies = [defaultProxy]
    }
}

/**
 * It takes an array of IP addresses and returns an array of objects with the IP addresses as the `ip`
 * property
 * @returns An array of objects.
 */

function setupDefaultProxies(): proxyType[] {

    let dcProxies = dcProxiesArray.map(ip => {
        return {
            ip,
            port: "60000",
            country: "LT",
            city: "Vilnius",
            username: dcProxyUsername,
            password: dcProxyPassword,
        }
    })
    return dcProxies
}

export {
    getHTML,
    getJson,
    getJsonLegacy,
    getResponseWithOptions,
    getUrl,
    request,
    setDatacenterProxies,
    setADefaultProxy,
    withRetries,
    getProxy,
    proxyConfig,
}