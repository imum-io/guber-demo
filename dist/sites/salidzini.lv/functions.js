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
exports.SLDFuntions = void 0;
const utils_1 = require("../../utils");
const sample_1 = require("./sample");
const enums_1 = require("../../config/enums");
const cookies_json_1 = __importDefault(require("./cookies.json"));
const aggregator_common_1 = require("../../common/aggregator-common");
const moment_1 = __importDefault(require("moment"));
class SLDFuntions {
    constructor() {
        this.headers = {};
        this.useHeadless = true;
        this.isXmlMode = false;
        this.fetchDomOnly = false;
        this.cookies = cookies_json_1.default;
        this.labelTranslations = {
            inStock: {
                lv: 'Noliktavā',
            }
        };
        for (let cookie of this.cookies) {
            if (cookie.expires) {
                cookie.expires = (0, moment_1.default)().add(1, 'years').unix();
            }
        }
    }
    urlToSourceId(url) {
        const regex = /^(https:\/\/www\.salidzini\.lv\/cena\?q=[\w]+)/;
        const match = url.match(regex);
        const sourceId = (0, utils_1.stringToHash)(match[0]);
        return sourceId;
    }
    supportsType(vehicleType) {
        return vehicleType == enums_1.vehicleTypes.aggregator || vehicleType == enums_1.vehicleTypes.aggregatorSource;
    }
    scrapeAggregatorItem($, url, adLinkMeta) {
        return __awaiter(this, void 0, void 0, function* () {
            let item = {};
            item.title = (0, utils_1.getNodeText)($('h1'));
            item.sourceId = this.urlToSourceId(url);
            item.countryCode = (0, utils_1.getCountryCode)(enums_1.countryCodes, url);
            let requiredTagNames = {
                title: 'h2.item_name',
                url: 'a.item_link',
                inStocktext: '.item_delivery_stock_frame .item_stock',
                subsource: '.item_shop_name_frame .item_shop_name',
                price: '.item_price',
                mainContainer: 'div[itemprop="offers"] .item_box_main'
            };
            item.brand = adLinkMeta === null || adLinkMeta === void 0 ? void 0 : adLinkMeta.brand;
            item.model = adLinkMeta === null || adLinkMeta === void 0 ? void 0 : adLinkMeta.model;
            item.declaredProductCode = adLinkMeta === null || adLinkMeta === void 0 ? void 0 : adLinkMeta.barcode;
            item.meta = {
                adLinkMeta
            };
            let baseUrl = (0, utils_1.getBaseUrl)(url);
            item.subItems = {
                aggregatorSource: this.aggregatorSourceDetails($, $(requiredTagNames.mainContainer), item.sourceId, requiredTagNames, baseUrl)
            };
            return item;
        });
    }
    getNextPageUrl($, url) {
        if (Array.from($('a.page.underline')).length > 0 && $(`img[src="/images/arrow_next.png"]`).length > 0) {
            const nextPageEl = $('a.page.underline').filter(function () {
                return $(this).find('img[src="/images/arrow_next.png"]').length > 0;
            });
            let nextPagePath = nextPageEl.attr('href');
            if (nextPagePath) {
                let baseUrl = (0, utils_1.getBaseUrl)(url);
                let nextPageUrl = baseUrl + '/cena' + nextPagePath;
                return nextPageUrl;
            }
        }
        return undefined;
    }
    addItems($, idUrls, url) {
        let title = (0, utils_1.getNodeText)($('h1'));
        let id = this.urlToSourceId(url);
        idUrls[id] = url;
    }
    isAdModified(currentItem, previousItem) {
        return (0, aggregator_common_1.isChangedAggregator)(currentItem, previousItem);
    }
    isSubitemModified(currentItem, previousItem) {
        return (0, aggregator_common_1.isChangedAggregatorSource)(currentItem, previousItem);
    }
    isAdRemoved($) {
        return false;
    }
    aggregatorSourceDetails($, infoContainer, sourceId, requiredTagNames, baseUrl) {
        let dataArray = [];
        infoContainer.each((i, elem) => {
            var _a, _b, _c, _d, _e, _f, _g;
            let priceType = 'member_price';
            let inStock = true;
            let title = (_a = $(requiredTagNames.title, elem)) === null || _a === void 0 ? void 0 : _a.text();
            let url = baseUrl + ((_b = $(requiredTagNames.url, elem)) === null || _b === void 0 ? void 0 : _b.attr('href'));
            let inStocktext = (_c = $(requiredTagNames.inStocktext, elem)) === null || _c === void 0 ? void 0 : _c.text();
            let subsource = (_d = $(requiredTagNames.subsource, elem)) === null || _d === void 0 ? void 0 : _d.text();
            let price = ((_e = $(`${requiredTagNames.price} span[itemprop="price"]`, elem)) === null || _e === void 0 ? void 0 : _e.attr('content')) || ((_f = $(`${requiredTagNames.price}`, elem)) === null || _f === void 0 ? void 0 : _f.text());
            price = (_g = price === null || price === void 0 ? void 0 : price.match(/^[0-9.]+$/)) === null || _g === void 0 ? void 0 : _g[0];
            let subsourceId = (0, utils_1.stringToHash)(subsource + title);
            let meta = { position: i };
            // if (matchLabelTranslation(inStocktext, this.labelTranslations.inStock, true)) {
            //     inStock = true
            // }
            dataArray.push({
                title,
                url,
                sourceId,
                subsource,
                subsourceId,
                inStock,
                price,
                priceType,
                meta,
            });
        });
        return dataArray;
    }
    testing() {
        return __awaiter(this, void 0, void 0, function* () {
            new sample_1.SLDTesting();
        });
    }
}
exports.SLDFuntions = SLDFuntions;
//# sourceMappingURL=functions.js.map