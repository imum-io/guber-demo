import fs from "fs";
import countryList from "country-list";
import {
  currentTimeZone,
  dbServers,
  invalidDate,
  vehicleTypes,
} from "./config/enums";
import moment, { Moment } from "moment";
import queryString from "query-string";
import cronParser from "cron-parser";
import axios, { AxiosResponse } from "axios";
import { sources } from "./sites/sources";
import momentTz from "moment-timezone";
import { v5 as uuidv5 } from "uuid";
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
  } catch (e) {
    return false;
  }
  return true;
}

function getCode(country) {
  let _country = country;
  if (matchRegex(country, /(?:Russia)/i)) {
    _country = "Russian Federation";
  }

  return countryList.getCode(_country);
}

function createDirIfNo(dir) {
  let path = pathPrefix + dir;
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
}

function getPath(filename, dir, suffix) {
  createDirIfNo(dir);
  let path = `${pathPrefix}${dir}/${filename}.`;
  path += suffix ? suffix : "json";
  return path;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sleepRandom(minMs, maxMs) {
  let randomSleepMs = Math.floor(Math.random() * maxMs) + minMs;
  console.log("sleeping for " + randomSleepMs / 1000 + " ms");
  await sleep(randomSleepMs);
}

function randomBetween(min, max) {
  let number = parseInt(Math.floor(Math.random() * max) + min);
  return number;
}

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
      } else if (typeof value === "string" || value instanceof String) {
        try {
          value = value.replaceAll(",", "");
          csv += value + ",";
        } catch (error) {
          console.log(
            "error removing commas for key " + key + " id " + item.id
          );
          console.log(error);
          csv += ",";
        }
      } else {
        csv += value + ",";
      }
    });
    csv += "\n";
  }

  fs.writeFile("./" + filename, csv, function (err) {
    if (err) {
      return console.log(err);
    }

    console.log("The file was saved!");
  });
}

function jsonFromFile(filename, initial) {
  let json;
  try {
    var contents: any = fs.readFileSync(filename);
    json = JSON.parse(contents);
  } catch (error) {
    console.log("error reading JSON from " + filename);
    return initial;
  }

  return json;
}

function jsonOrStringForDb(meta: any) {
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

function jsonOrStringToJson(meta: any): any {
  if (!meta) {
    return {};
  }

  if (typeof meta === "string") {
    let escapedMeta = meta.replaceAll("\\\\", "\\").replaceAll("\\'", "'");
    return JSON.parse(escapedMeta);
  }

  return meta;
}

async function isImageUrl(url: string) {
  let retries = 2;
  let validated = false;

  while (retries > 0) {
    try {
      let res: AxiosResponse = await axios(url);

      if (res.status == 200) {
        let contentType = res.headers["content-type"];
        validated = contentType && contentType.match(/(image)+\//g).length != 0;
      }
      break;
    } catch (e) {
      retries--;
    }
  }

  return validated;
}

function readFile(filename) {
  let contents;
  try {
    contents = fs.readFileSync(filename, "utf8");
  } catch (error) {
    console.log("error reading from " + filename);
    contents = "";
  }

  return contents;
}

function readTestingFile(filename, source) {
  let path = `htmls/${source}/${filename}.html`;

  if (fs.existsSync(path)) {
    return readFile(path);
  }

  return null;
}

function htmlFromFile(filename, portalId) {
  let path = getPath(filename, "htmls/" + portalId, "html");

  if (fs.existsSync(path)) {
    return readFile(path);
  }

  return null;
}

function htmlToFile(text, filename, portalId, isSaveImages, imageId) {
  let path = getPath(filename, "htmls/" + portalId, "html");
  var string = text;
  try {
    fs.writeFileSync(path, string);
  } catch (error) {
    console.log("error saving to file " + error);
  }

  if (isSaveImages) {
    // Don't save images if not needed - they take lots of space
    // Only use would be to train an AI model
    let defaultImagePath = `../images/${imageId}.png`;
    let properImagePath = `../images/${filename}.png`;
    if (fs.existsSync(defaultImagePath)) {
      fs.rename(defaultImagePath, properImagePath, function (err) {
        if (err) console.log("ERROR renaming image: " + err);
      });
    }
  }
}

function isValidURL(str) {
  var pattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$",
    "i"
  ); // fragment locator
  return !!pattern.test(str);
}

function jsonToFile(json, filename) {
  var string = JSON.stringify(json);
  try {
    fs.writeFileSync(filename, string);
  } catch (error) {
    console.log("error saving json " + error);
  }
}
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

function matchRegex(label, regex) {
  if (!label) {
    return false;
  }
  return Boolean(label.match(regex));
}

function matchLabelTranslation(
  label: string,
  translation: any,
  caseSensitive: boolean = false
) {
  for (const property in translation) {
    let value = caseSensitive
      ? translation[property]
      : translation[property]?.toLowerCase();
    label = caseSensitive ? label : label?.toLowerCase();
    if (!value) {
      // In case value == "" as a placeholder
      return false;
    }
    if (label?.includes(value)) {
      return true;
    }
  }
  return false;
}

function matchValue(label, regex) {
  let matched = label.match(regex);

  if (matched && matched.length > 0) {
    return matched[0];
  }

  return "";
}

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

function findElementByText($, searchedTag, searchedText) {
  function comparer(index, element) {
    const text = $(element).text();
    return text.includes(searchedText);
  }

  var foundElement = $(searchedTag).filter(comparer)[0];
  return foundElement;
}

function removeExtraWhitespace(text) {
  return text.replace(/\r?\n|\r/g, "").replace(/\s\s+/g, " ");
}

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

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function formatToDate(value, dateFormat) {
  let formatted = momentTz(value, dateFormat).tz(currentTimeZone);
  if (formatted.isValid()) {
    return formatted.format("YYYY-MM-DD HH:mm:ss");
  }
  return null;
}

function formatToDatePredefined(value, format?) {
  if (!value) {
    return null;
  }

  let formatted = momentTz(value)
    .tz(currentTimeZone)
    .format(format || "YYYY-MM-DD HH:mm:ss");

  if (formatted !== invalidDate) {
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

function makeHtmlName(sourceId, timeStr?) {
  return sourceId + "__" + moment(timeStr).format("YYYY-MM-DD");
}

function makeHtmlNameFromUrl(url: string) {
  const name = getImageNameForBucket(url);
  return makeHtmlName(name) + ".html";
}
function formatTimeToLTZone(format?: string) {
  return momentTz()
    .tz(currentTimeZone)
    .format(format ?? "YYYY-MM-DD HH:mm:ss");
}

function isSamePrice(price1, price2) {
  let isSame = false;
  if (!price1 && !price2) {
    isSame = true;
  } else if (price1 && price2) {
    if (Math.abs(price1 - price2) < 1) {
      // Ignore price discreptences that are less than 1 money unit
      isSame = true;
    }
  }
  return isSame;
}

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

  let date1Moment = moment(date1, "YYYY-MM-DDTHH:mm:ssZZ");
  let date2Moment = moment(date2, "YYYY-MM-DDTHH:mm:ssZZ");
  if (date1Moment.unix() != date2Moment.unix()) {
    let diff = date1Moment.diff(date2Moment, "hours");
    if (Math.abs(diff) > maxDiffInHours) {
      return true;
    }
  }

  return false;
}

function extendUrlWithPrice(url, pMin, pMax) {
  // Specifically for mobile.de mobile app JSON url
  let pStr = `${pMin}:${pMax}`;
  let extendedUrl = url;

  let split = url.split("?");

  let params = queryString.parse(split[1]);
  params.p = pStr;
  extendedUrl = split[0] + "?" + queryString.stringify(params);
  return extendedUrl;
}

function warningMessage(message) {
  console.log("\x1b[33m%s\x1b[0m", message);
}

function shouldSkipToday(frequency: string): boolean {
  let parsed: cronParser.CronExpression<false>;
  try {
    parsed = cronParser.parseExpression(frequency);
  } catch (error) {
    console.log(`${frequency} is not valid corn format!`);
    return false;
  }
  const day: any = parsed.fields.dayOfWeek;
  const today = new Date().getDay();
  return !day.includes(today);
}

function shouldProcessLists(now: Moment) {
  // TODO: temporary function
  // Later all links should have their cronjobs
  // And similar function should check whether it's that cronjob should be executed within next 10 mins
  const midnight = moment().startOf("day").add(1, "hour");
  const xMinutesPastMidnight = moment(midnight).add(10, "minute");

  return now.isBetween(midnight, xMinutesPastMidnight, null, "[)");
}

function getBaseUrl(url: string) {
  const urlObject = new URL(url);
  const origin = urlObject.origin;
  return origin;
}

function removeInjection(value) {
  if (value) {
    value = value.replaceAll("'", "");
    value = value.replace(/\\/g, "");
    value = value.replace(
      /([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g,
      ""
    );
    value = value.replace(
      /(\u00a9|\u00ae|\uDBFF|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g,
      ""
    );
    value = value.trim();
  }
  return value;
}

function getHostNoTLD(url: string) {
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

function jsonEscape(str: string) {
  return str
    ?.replace(/[\"]/g, "")
    .replace(/[\\]/g, "")
    .replace(/[\\n\\n]/g, "")
    .replace(/[\/]/g, "")
    .replace(/[\b]/g, "")
    .replace(/[\f]/g, "")
    .replace(/[\n]/g, "; ")
    .replace(/[\r]/g, "")
    .replace(/[\t]/g, "");
}

function getCountryCode(countryCodes: any, url: string) {
  const baseUrl = url.split("/")[2];
  const countryCodeFromUrl: any = baseUrl.split(".").slice(-1);

  return countryCodes[countryCodeFromUrl];
}

function createDirIfNotExist(path) {
  try {
    fs.accessSync(path);
    console.log(`${path} exists!!`);
  } catch {
    fs.mkdirSync(path, { recursive: true });
    console.log(`${path} not exists!! Created`);
  }
}

function convertToKg(value: string): string {
  if (value?.match(/[0-9.]*\W*(g$|gram$)/g) && !value.includes("kg")) {
    let weight = parseFloat(value.replace(/[^0-9]/g, "")) / 1000;
    return weight.toString();
  }
  return value;
}

function getImageNameForBucket(url: string, source?: string): string {
  let name = url.split("://")[1]?.replaceAll("/", "-");

  return name;
}

function validateBarcode(barcode: string) {
  return barcode?.match(/^\d.{9,}$/) || false;
}

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

function writeJsonIntoFile(items: any, filePath) {
  let data = JSON.stringify(items, null, 4);
  fs.writeFileSync(filePath, data, "utf8");
  console.log("saved");
}

function lowerCaseSourceId(value) {
  return removeInjection(value?.toLowerCase());
}

function getDbserver(productType: string) {
  if (
    productType == vehicleTypes.trailer ||
    productType == vehicleTypes.truck
  ) {
    return dbServers.trucks;
  } else if (
    productType == vehicleTypes.household ||
    productType == vehicleTypes.realestateProject
  ) {
    return dbServers.realestate;
  } else if (productType == vehicleTypes.car) {
    return dbServers.cars;
  } else {
    return dbServers.pharmacy;
  }
}

function decodeHtml(encodedStr) {
  let decodedString = he.decode(encodedStr);
  return decodedString;
}

function stringOrNullForDb(value?: string) {
  return value ? `'${value}'` : "null";
}

function stringToHash(value: string, useLegacyUnlowercased = false) {
  let namespace = "26167fe1-6463-4c97-b958-255f901cb179";
  let lowercased = value.toLowerCase();
  return uuidv5(useLegacyUnlowercased ? value : lowercased, namespace);
}

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

export {
  stringOrNullForDb,
  arrayToCSV,
  getCountryCode,
  jsonFromFile,
  jsonToFile,
  htmlToFile,
  htmlFromFile,
  readTestingFile,
  createDirIfNo,
  createDirIfNotExist,
  getPath,
  sleep,
  sleepRandom,
  shouldSkipToday,
  randomBetween,
  readFile,
  formatToDatePredefined,
  makeHtmlName,
  isSamePrice,
  isDifferentDate,
  extendUrlWithPrice,
  warningMessage,
  removeInjection,
  getRandomArray,
  matchRegex,
  matchValue,
  translateItem,
  matchLabelTranslation,
  getNodeText,
  getTextNodeValueOfElem,
  findElementByText,
  removeExtraWhitespace,
  getCode,
  getConsumptionVal,
  capitalizeFirstLetter,
  isValidURL,
  getBaseUrl,
  getHostNoTLD,
  jsonEscape,
  shouldProcessLists,
  isImageUrl,
  jsonOrStringToJson,
  jsonOrStringForDb,
  convertToKg,
  getImageNameForBucket,
  makeHtmlNameFromUrl,
  validateBarcode,
  range,
  writeJsonIntoFile,
  isJsonString,
  formatTimeToLTZone,
  lowerCaseSourceId,
  getDbserver,
  decodeHtml,
  createCustomError,
  stringToHash,
};
