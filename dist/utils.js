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
exports.isJsonString = exports.writeJsonIntoFile = exports.range = exports.validateBarcode = exports.makeHtmlNameFromUrl = exports.getImageNameForBucket = exports.convertToKg = exports.jsonOrStringForDb = exports.jsonOrStringToJson = exports.isImageUrl = exports.shouldProcessLists = exports.jsonEscape = exports.getHostNoTLD = exports.getBaseUrl = exports.isValidURL = exports.capitalizeFirstLetter = exports.getConsumptionVal = exports.getCode = exports.removeExtraWhitespace = exports.findElementByText = exports.getTextNodeValueOfElem = exports.getNodeText = exports.matchLabelTranslation = exports.translateItem = exports.matchValue = exports.matchRegex = exports.getRandomArray = exports.removeInjection = exports.warningMessage = exports.extendUrlWithPrice = exports.isDifferentDate = exports.isSamePrice = exports.makeHtmlName = exports.formatToDatePredefined = exports.readFile = exports.randomBetween = exports.shouldSkipToday = exports.sleepRandom = exports.sleep = exports.getPath = exports.createDirIfNotExist = exports.createDirIfNo = exports.readTestingFile = exports.htmlFromFile = exports.htmlToFile = exports.jsonToFile = exports.jsonFromFile = exports.getCountryCode = exports.arrayToCSV = exports.stringOrNullForDb = void 0;
exports.stringToHash = exports.createCustomError = exports.decodeHtml = exports.getDbserver = exports.lowerCaseSourceId = exports.formatTimeToLTZone = void 0;
const fs_1 = __importDefault(require("fs"));
const country_list_1 = __importDefault(require("country-list"));
const enums_1 = require("./config/enums");
const moment_1 = __importDefault(require("moment"));
const query_string_1 = __importDefault(require("query-string"));
const cron_parser_1 = __importDefault(require("cron-parser"));
const axios_1 = __importDefault(require("axios"));
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const uuid_1 = require("uuid");
const he = require("he");
let pathPrefix = "../data/";
// TODO: remove unnecessary features
const allFeatures = [
    "ABS",
    "Auxiliary heating",
    "Cruise control",
    "Full Fairing",
    "Full Service History",
    "Renting Possible",
    "Super Single Wheels",
    "ESP",
    "Retarder/Intarder",
    "Compressor",
    "EBS",
    "Navigation system",
    "Secondary Air Conditioning",
    "Particulate filter",
    "Urea Tank (AdBlue)",
    "Alloy wheels",
    "Four wheel drive",
    "Adaptive Cruise Control",
    "Biodiesel Conversion",
];
function isJsonString(str) {
    try {
        JSON.parse(str);
    }
    catch (e) {
        return false;
    }
    return true;
}
exports.isJsonString = isJsonString;
function getCode(country) {
    let _country = country;
    if (matchRegex(country, /(?:Russia)/i)) {
        _country = "Russian Federation";
    }
    return country_list_1.default.getCode(_country);
}
exports.getCode = getCode;
function createDirIfNo(dir) {
    let path = pathPrefix + dir;
    if (!fs_1.default.existsSync(path)) {
        fs_1.default.mkdirSync(path, { recursive: true });
    }
}
exports.createDirIfNo = createDirIfNo;
function getPath(filename, dir, suffix) {
    createDirIfNo(dir);
    let path = `${pathPrefix}${dir}/${filename}.`;
    path += suffix ? suffix : "json";
    return path;
}
exports.getPath = getPath;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
exports.sleep = sleep;
function sleepRandom(minMs, maxMs) {
    return __awaiter(this, void 0, void 0, function* () {
        let randomSleepMs = Math.floor(Math.random() * maxMs) + minMs;
        console.log("sleeping for " + randomSleepMs / 1000 + " ms");
        yield sleep(randomSleepMs);
    });
}
exports.sleepRandom = sleepRandom;
function randomBetween(min, max) {
    let number = parseInt(Math.floor(Math.random() * max) + min);
    return number;
}
exports.randomBetween = randomBetween;
function arrayToCSV(parsedItems, filename) {
    let csv = "";
    let keys;
    for (let i = 0, len = parsedItems.length; i < len; i++) {
        const item = parsedItems[i];
        if (!keys) {
            if (item.features) {
                allFeatures.forEach((feature) => {
                    if (!item[feature]) {
                        item[feature] = false;
                    }
                });
            }
            keys = Object.keys(item);
            csv += keys.join(",");
            csv += "\n";
        }
        keys.forEach((key) => {
            let value = item[key];
            // Removing descriptions as they are almost not relevant for excel and take most of space
            if (key.startsWith("description") || !value) {
                csv += ",";
            }
            else if (typeof value === "string" || value instanceof String) {
                try {
                    value = value.replaceAll(",", "");
                    csv += value + ",";
                }
                catch (error) {
                    console.log("error removing commas for key " + key + " id " + item.id);
                    console.log(error);
                    csv += ",";
                }
            }
            else {
                csv += value + ",";
            }
        });
        csv += "\n";
    }
    fs_1.default.writeFile("./" + filename, csv, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
}
exports.arrayToCSV = arrayToCSV;
function jsonFromFile(filename, initial) {
    let json;
    try {
        var contents = fs_1.default.readFileSync(filename);
        json = JSON.parse(contents);
    }
    catch (error) {
        console.log("error reading JSON from " + filename);
        return initial;
    }
    return json;
}
exports.jsonFromFile = jsonFromFile;
function jsonOrStringForDb(meta) {
    if (!meta) {
        return "{}";
    }
    if (typeof meta === "object" && Object.keys(meta).length == 0) {
        return "{}";
    }
    if (typeof meta === "string") {
        return meta;
    }
    let metaStr = JSON.stringify(meta);
    let metaStrEscaped = metaStr.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
    return metaStrEscaped;
}
exports.jsonOrStringForDb = jsonOrStringForDb;
function jsonOrStringToJson(meta) {
    if (!meta) {
        return {};
    }
    if (typeof meta === "string") {
        let escapedMeta = meta.replaceAll("\\\\", "\\").replaceAll("\\'", "'");
        return JSON.parse(escapedMeta);
    }
    return meta;
}
exports.jsonOrStringToJson = jsonOrStringToJson;
function isImageUrl(url) {
    return __awaiter(this, void 0, void 0, function* () {
        let retries = 2;
        let validated = false;
        while (retries > 0) {
            try {
                let res = yield (0, axios_1.default)(url);
                if (res.status == 200) {
                    let contentType = res.headers["content-type"];
                    validated = contentType && contentType.match(/(image)+\//g).length != 0;
                }
                break;
            }
            catch (e) {
                retries--;
            }
        }
        return validated;
    });
}
exports.isImageUrl = isImageUrl;
function readFile(filename) {
    let contents;
    try {
        contents = fs_1.default.readFileSync(filename, "utf8");
    }
    catch (error) {
        console.log("error reading from " + filename);
        contents = "";
    }
    return contents;
}
exports.readFile = readFile;
function readTestingFile(filename, source) {
    let path = `htmls/${source}/${filename}.html`;
    if (fs_1.default.existsSync(path)) {
        return readFile(path);
    }
    return null;
}
exports.readTestingFile = readTestingFile;
function htmlFromFile(filename, portalId) {
    let path = getPath(filename, "htmls/" + portalId, "html");
    if (fs_1.default.existsSync(path)) {
        return readFile(path);
    }
    return null;
}
exports.htmlFromFile = htmlFromFile;
function htmlToFile(text, filename, portalId, isSaveImages, imageId) {
    let path = getPath(filename, "htmls/" + portalId, "html");
    var string = text;
    try {
        fs_1.default.writeFileSync(path, string);
    }
    catch (error) {
        console.log("error saving to file " + error);
    }
    if (isSaveImages) {
        // Don't save images if not needed - they take lots of space
        // Only use would be to train an AI model
        let defaultImagePath = `../images/${imageId}.png`;
        let properImagePath = `../images/${filename}.png`;
        if (fs_1.default.existsSync(defaultImagePath)) {
            fs_1.default.rename(defaultImagePath, properImagePath, function (err) {
                if (err)
                    console.log("ERROR renaming image: " + err);
            });
        }
    }
}
exports.htmlToFile = htmlToFile;
function isValidURL(str) {
    var pattern = new RegExp("^(https?:\\/\\/)?" + // protocol
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
        "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
        "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
        "(\\#[-a-z\\d_]*)?$", "i"); // fragment locator
    return !!pattern.test(str);
}
exports.isValidURL = isValidURL;
function jsonToFile(json, filename) {
    var string = JSON.stringify(json);
    try {
        fs_1.default.writeFileSync(filename, string);
    }
    catch (error) {
        console.log("error saving json " + error);
    }
}
exports.jsonToFile = jsonToFile;
/**
 *
 * @param {CheerioAPI} elem A Cheerio node that has text into it
 * @returns {string} trimmed and minified text
 */
function getNodeText(elem) {
    if (elem) {
        const text = elem.text();
        if (text) {
            return text.trim();
        }
    }
}
exports.getNodeText = getNodeText;
function getTextNodeValueOfElem(elem) {
    let textElem = elem.contents().filter(function () {
        return this.nodeType == 3;
    });
    if (textElem) {
        const text = textElem.text();
        if (text) {
            return jsonEscape(text.trim());
        }
    }
}
exports.getTextNodeValueOfElem = getTextNodeValueOfElem;
function getRandomArray(sumOfNumbers, numberOfMembers) {
    let randomArray = [];
    for (let index = 0; index < numberOfMembers - 1; index++) {
        let randomNum = randomBetween(0, sumOfNumbers - 10);
        randomArray.push(randomNum);
        sumOfNumbers = sumOfNumbers - randomNum;
    }
    randomArray.push(sumOfNumbers);
    return randomArray.sort((a, b) => a - b);
}
exports.getRandomArray = getRandomArray;
function matchRegex(label, regex) {
    if (!label) {
        return false;
    }
    return Boolean(label.match(regex));
}
exports.matchRegex = matchRegex;
function matchLabelTranslation(label, translation, caseSensitive = false) {
    var _a;
    for (const property in translation) {
        let value = caseSensitive
            ? translation[property]
            : (_a = translation[property]) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        label = caseSensitive ? label : label === null || label === void 0 ? void 0 : label.toLowerCase();
        if (!value) {
            // In case value == "" as a placeholder
            return false;
        }
        if (label === null || label === void 0 ? void 0 : label.includes(value)) {
            return true;
        }
    }
    return false;
}
exports.matchLabelTranslation = matchLabelTranslation;
function matchValue(label, regex) {
    let matched = label.match(regex);
    if (matched && matched.length > 0) {
        return matched[0];
    }
    return "";
}
exports.matchValue = matchValue;
function translateItem(item, translations) {
    for (let i = 0, len = translations.length; i < len; i++) {
        const { key, pairs } = translations[i];
        if (item[key]) {
            pairs.forEach((pair) => {
                item[key] = item[key].replaceAll(pair.from, pair.to);
            });
        }
    }
}
exports.translateItem = translateItem;
function findElementByText($, searchedTag, searchedText) {
    function comparer(index, element) {
        const text = $(element).text();
        return text.includes(searchedText);
    }
    var foundElement = $(searchedTag).filter(comparer)[0];
    return foundElement;
}
exports.findElementByText = findElementByText;
function removeExtraWhitespace(text) {
    return text.replace(/\r?\n|\r/g, "").replace(/\s\s+/g, " ");
}
exports.removeExtraWhitespace = removeExtraWhitespace;
function getConsumptionVal(value, key) {
    if (!value || !value.includes(key)) {
        return null;
    }
    value = value.split(key)[0];
    if (value.includes(".")) {
        value = value.split(".")[1];
    }
    return value;
}
exports.getConsumptionVal = getConsumptionVal;
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
exports.capitalizeFirstLetter = capitalizeFirstLetter;
function formatToDate(value, dateFormat) {
    let formatted = (0, moment_timezone_1.default)(value, dateFormat).tz(enums_1.currentTimeZone);
    if (formatted.isValid()) {
        return formatted.format("YYYY-MM-DD HH:mm:ss");
    }
    return null;
}
function formatToDatePredefined(value, format) {
    if (!value) {
        return null;
    }
    let formatted = (0, moment_timezone_1.default)(value)
        .tz(enums_1.currentTimeZone)
        .format(format || "YYYY-MM-DD HH:mm:ss");
    if (formatted !== enums_1.invalidDate) {
        return formatted;
    }
    let formats = [
        "MM/YYYY/DD",
        "MM/YYYY",
        "YYYY/MM",
        "YYYY/M",
        "M/YYYY",
        "YYYY",
        "DD/MM/YYYY",
        "YYYY/MM/DD",
    ];
    for (let format of formats) {
        if (value.length === format.length) {
            formatted = formatToDate(value, format);
            if (formatted) {
                break;
            }
            formatted = null;
        }
    }
    return formatted;
}
exports.formatToDatePredefined = formatToDatePredefined;
function makeHtmlName(sourceId, timeStr) {
    return sourceId + "__" + (0, moment_1.default)(timeStr).format("YYYY-MM-DD");
}
exports.makeHtmlName = makeHtmlName;
function makeHtmlNameFromUrl(url) {
    const name = getImageNameForBucket(url);
    return makeHtmlName(name) + ".html";
}
exports.makeHtmlNameFromUrl = makeHtmlNameFromUrl;
function formatTimeToLTZone(format) {
    return (0, moment_timezone_1.default)()
        .tz(enums_1.currentTimeZone)
        .format(format !== null && format !== void 0 ? format : "YYYY-MM-DD HH:mm:ss");
}
exports.formatTimeToLTZone = formatTimeToLTZone;
function isSamePrice(price1, price2) {
    let isSame = false;
    if (!price1 && !price2) {
        isSame = true;
    }
    else if (price1 && price2) {
        if (Math.abs(price1 - price2) < 1) {
            // Ignore price discreptences that are less than 1 money unit
            isSame = true;
        }
    }
    return isSame;
}
exports.isSamePrice = isSamePrice;
function isDifferentDate(date1, date2) {
    // Adding maxDiffInHours because currently we have servers in different timezones.
    // So scraped data differs by up to 6 hours
    let maxDiffInHours = 24;
    if (!date1 && !date2) {
        return false;
    }
    if ((date1 && !date2) || (!date1 && date2)) {
        return true;
    }
    let date1Moment = (0, moment_1.default)(date1, "YYYY-MM-DDTHH:mm:ssZZ");
    let date2Moment = (0, moment_1.default)(date2, "YYYY-MM-DDTHH:mm:ssZZ");
    if (date1Moment.unix() != date2Moment.unix()) {
        let diff = date1Moment.diff(date2Moment, "hours");
        if (Math.abs(diff) > maxDiffInHours) {
            return true;
        }
    }
    return false;
}
exports.isDifferentDate = isDifferentDate;
function extendUrlWithPrice(url, pMin, pMax) {
    // Specifically for mobile.de mobile app JSON url
    let pStr = `${pMin}:${pMax}`;
    let extendedUrl = url;
    let split = url.split("?");
    let params = query_string_1.default.parse(split[1]);
    params.p = pStr;
    extendedUrl = split[0] + "?" + query_string_1.default.stringify(params);
    return extendedUrl;
}
exports.extendUrlWithPrice = extendUrlWithPrice;
function warningMessage(message) {
    console.log("\x1b[33m%s\x1b[0m", message);
}
exports.warningMessage = warningMessage;
function shouldSkipToday(frequency) {
    let parsed;
    try {
        parsed = cron_parser_1.default.parseExpression(frequency);
    }
    catch (error) {
        console.log(`${frequency} is not valid corn format!`);
        return false;
    }
    const day = parsed.fields.dayOfWeek;
    const today = new Date().getDay();
    return !day.includes(today);
}
exports.shouldSkipToday = shouldSkipToday;
function shouldProcessLists(now) {
    // TODO: temporary function
    // Later all links should have their cronjobs
    // And similar function should check whether it's that cronjob should be executed within next 10 mins
    const midnight = (0, moment_1.default)().startOf("day").add(1, "hour");
    const xMinutesPastMidnight = (0, moment_1.default)(midnight).add(10, "minute");
    return now.isBetween(midnight, xMinutesPastMidnight, null, "[)");
}
exports.shouldProcessLists = shouldProcessLists;
function getBaseUrl(url) {
    const urlObject = new URL(url);
    const origin = urlObject.origin;
    return origin;
}
exports.getBaseUrl = getBaseUrl;
function removeInjection(value) {
    if (value) {
        value = value.replaceAll("'", "");
        value = value.replace(/\\/g, "");
        value = value.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, "");
        value = value.replace(/(\u00a9|\u00ae|\uDBFF|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g, "");
        value = value.trim();
    }
    return value;
}
exports.removeInjection = removeInjection;
function getHostNoTLD(url) {
    const urlObject = new URL(url);
    const host = urlObject.host.replace("www.", "");
    let hostNoTLD = null;
    if (host) {
        let parts = host.split(".");
        parts.splice(parts.length - 1, 1);
        hostNoTLD = parts.join(".");
    }
    return hostNoTLD;
}
exports.getHostNoTLD = getHostNoTLD;
function jsonEscape(str) {
    return str === null || str === void 0 ? void 0 : str.replace(/[\"]/g, "").replace(/[\\]/g, "").replace(/[\\n\\n]/g, "").replace(/[\/]/g, "").replace(/[\b]/g, "").replace(/[\f]/g, "").replace(/[\n]/g, "; ").replace(/[\r]/g, "").replace(/[\t]/g, "");
}
exports.jsonEscape = jsonEscape;
function getCountryCode(countryCodes, url) {
    const baseUrl = url.split("/")[2];
    const countryCodeFromUrl = baseUrl.split(".").slice(-1);
    return countryCodes[countryCodeFromUrl];
}
exports.getCountryCode = getCountryCode;
function createDirIfNotExist(path) {
    try {
        fs_1.default.accessSync(path);
        console.log(`${path} exists!!`);
    }
    catch (_a) {
        fs_1.default.mkdirSync(path, { recursive: true });
        console.log(`${path} not exists!! Created`);
    }
}
exports.createDirIfNotExist = createDirIfNotExist;
function convertToKg(value) {
    if ((value === null || value === void 0 ? void 0 : value.match(/[0-9.]*\W*(g$|gram$)/g)) && !value.includes("kg")) {
        let weight = parseFloat(value.replace(/[^0-9]/g, "")) / 1000;
        return weight.toString();
    }
    return value;
}
exports.convertToKg = convertToKg;
function getImageNameForBucket(url, source) {
    var _a;
    let name = (_a = url.split("://")[1]) === null || _a === void 0 ? void 0 : _a.replaceAll("/", "-");
    return name;
}
exports.getImageNameForBucket = getImageNameForBucket;
function validateBarcode(barcode) {
    return (barcode === null || barcode === void 0 ? void 0 : barcode.match(/^\d.{9,}$/)) || false;
}
exports.validateBarcode = validateBarcode;
function range(start, end, step = 1) {
    let output = [];
    if (typeof end === "undefined") {
        end = start;
        start = 0;
    }
    for (let i = start; i <= end; i += step) {
        output.push(i);
    }
    return output;
}
exports.range = range;
function writeJsonIntoFile(items, filePath) {
    let data = JSON.stringify(items, null, 4);
    fs_1.default.writeFileSync(filePath, data, "utf8");
    console.log("saved");
}
exports.writeJsonIntoFile = writeJsonIntoFile;
function lowerCaseSourceId(value) {
    return removeInjection(value === null || value === void 0 ? void 0 : value.toLowerCase());
}
exports.lowerCaseSourceId = lowerCaseSourceId;
function getDbserver(productType) {
    if (productType == enums_1.vehicleTypes.trailer ||
        productType == enums_1.vehicleTypes.truck) {
        return enums_1.dbServers.trucks;
    }
    else if (productType == enums_1.vehicleTypes.household ||
        productType == enums_1.vehicleTypes.realestateProject) {
        return enums_1.dbServers.realestate;
    }
    else if (productType == enums_1.vehicleTypes.car) {
        return enums_1.dbServers.cars;
    }
    else {
        return enums_1.dbServers.pharmacy;
    }
}
exports.getDbserver = getDbserver;
function decodeHtml(encodedStr) {
    let decodedString = he.decode(encodedStr);
    return decodedString;
}
exports.decodeHtml = decodeHtml;
function stringOrNullForDb(value) {
    return value ? `'${value}'` : "null";
}
exports.stringOrNullForDb = stringOrNullForDb;
function stringToHash(value, useLegacyUnlowercased = false) {
    let namespace = "26167fe1-6463-4c97-b958-255f901cb179";
    let lowercased = value.toLowerCase();
    return (0, uuid_1.v5)(useLegacyUnlowercased ? value : lowercased, namespace);
}
exports.stringToHash = stringToHash;
function createCustomError(errorObject) {
    if (!errorObject.message) {
        throw new Error("Error Object should always contain 'message'");
    }
    const customError = new Error(errorObject.message);
    for (const key in errorObject) {
        if (key != "message") {
            const value = errorObject[key];
            customError[key] = value;
        }
    }
    return customError;
}
exports.createCustomError = createCustomError;
//# sourceMappingURL=utils.js.map