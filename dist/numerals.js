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
exports.setNumeral = exports.getCurrencies = exports.formatNumber = exports.formatPrice = void 0;
const moment_1 = __importDefault(require("moment"));
const network_utils_1 = require("./network-utils");
const utils_1 = require("./utils");
const numeral_1 = __importDefault(require("numeral"));
const config_1 = require("./config");
const lodash_1 = require("lodash");
const logger_1 = __importDefault(require("./libs/logger"));
let isLocaleSet = false;
let currencies = {};
setNumeral();
function setNumeral() {
    if (isLocaleSet) {
        return;
    }
    isLocaleSet = true;
    numeral_1.default.register("locale", "truck", {
        delimiters: {
            thousands: " ",
            decimal: "."
        },
        abbreviations: {
            thousand: "k",
            million: "mil",
            billion: "bil",
            trillion: "tril"
        },
        ordinal: function (number) {
            return ".";
        },
        currency: {
            symbol: "€"
        }
    });
    numeral_1.default.locale('truck');
}
exports.setNumeral = setNumeral;
String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    var escapedSearch = search.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    return target.replace(new RegExp(escapedSearch, 'g'), replacement);
};
function formatPrice(value) {
    if (!value) {
        // return value
        return null;
    }
    else if (typeof value == 'number') {
        return value;
    }
    let decimalKey = "DECIMAL_KEY";
    let i = value.length;
    let numericsFound = 0;
    while (i--) {
        let c = value.charAt(i);
        if (numericsFound <= 2) {
            // Search for cents symbol
            // If 3 digits, then it's not cents but thousands symbol
            if (c === ',' || c === '.') {
                value = value.substring(0, i) + decimalKey + value.substring(i + 1);
            }
        }
        else {
            // Small optimisation
            break;
        }
        if (c >= '0' && c <= '9') {
            numericsFound++;
        }
    }
    value = value.replaceAll('.', ',');
    value = value.replaceAll(decimalKey, '.');
    let num = (0, numeral_1.default)(value).value();
    return Math.abs(num);
}
exports.formatPrice = formatPrice;
function formatNumber(value, dontReplaceDots, dotsToCommas) {
    if (!value)
        return null;
    if (!isNaN(value)) {
        return Number(value);
    }
    // replace dots with commas
    let newValue = value;
    if (!dontReplaceDots) {
        newValue = value.replaceAll('.', ',');
    }
    if (dotsToCommas) {
        newValue = value.replaceAll(',', '.');
    }
    let num = (0, numeral_1.default)(newValue).value();
    return Math.abs(num);
    // return parseInt(Math.abs(numeral(newValue)))
}
exports.formatNumber = formatNumber;
function getPLNCurrency(date = (0, moment_1.default)().subtract(1, 'day'), tries = 0) {
    if (tries > 10) {
        logger_1.default.error("No currency: no PLN currency");
    }
    let format = 'YYYY-MM-DD';
    let uriStart = 'http://api.nbp.pl/api/exchangerates/rates/a/eur/';
    let uriFinish = '?format=json';
    let uri = uriStart + date.format(format) + uriFinish;
    // console.log("URI", uri, tries)
    return (0, network_utils_1.request)(uri)
        .then(response => {
        return response.rates[0].mid;
    })
        .then(rate => {
        return rate;
    })
        .catch(error => {
        // If error, try a day before
        return getPLNCurrency(date.subtract(1, 'day'), tries + 1);
    });
}
function getRUBCurrency(date = (0, moment_1.default)().subtract(1, 'day'), tries = 0) {
    if (tries > 10) {
        logger_1.default.error("No currency: no RUB currency");
        return 0;
    }
    let uri = 'https://v6.exchangerate-api.com/v6/2ec575b4f8b1550123ed7716/latest/eur';
    return (0, network_utils_1.request)(uri)
        .then(response => {
        let rate = response.conversion_rates.RUB;
        return rate;
    })
        .catch(error => {
        console.log("ERROR getRUBCurrency", error);
        return (0, utils_1.sleep)(1000)
            .then(() => {
            return getRUBCurrency(date.subtract(1, 'day'), tries + 1);
        });
    });
}
function getCurrencies() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, lodash_1.isEmpty)(currencies)) {
            return currencies;
        }
        if (config_1.isProd) {
            currencies.EUR = { regex: /(?:eur|€)/i, rate: 1 };
            currencies.PLN = { regex: /(?:pln|pl)/i, rate: yield getPLNCurrency() };
            currencies.RUB = { regex: /(?:rub|₽)/i, rate: yield getRUBCurrency() };
            currencies.keys = ['EUR', 'RUB', 'PLN'];
        }
        else {
            currencies = {};
            currencies.EUR = { regex: /(?:eur|€)/i, rate: 1 };
            currencies.PLN = { regex: /(?:pln|pl)/i, rate: 4.3451 };
            currencies.RUB = { regex: /(?:rub|₽)/i, rate: 83.6584 };
            currencies.keys = ['EUR', 'RUB', 'PLN'];
        }
        return currencies;
    });
}
exports.getCurrencies = getCurrencies;
//# sourceMappingURL=numerals.js.map