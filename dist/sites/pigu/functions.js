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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PGUFunctions = void 0;
const homeAppliences_common_1 = require("../../common/homeAppliences-common");
const utils_1 = require("../../utils");
const sample_1 = require("./sample");
class PGUFunctions {
    constructor() {
        this.headers = {};
        this.useHeadless = false;
        this.labelTranslations = {
            width: {
                lt: 'Plotis',
            },
            height: {
                lt: 'Aukštis',
            },
            depth: {
                lt: 'Gylis',
            },
            weight: {
                lt: 'Svoris',
            },
            color: {
                lt: 'Spalva',
            },
            length: {
                lt: 'Ilgis',
            },
            power: {
                lt: 'Galia',
            },
            dimensions: {
                lt: 'Matmenys',
            },
            model: {
                lt: 'Gamintojo kodas',
            },
        };
    }
    getNextPageUrl($, url) {
        var _a;
        const baseUrl = (0, utils_1.getBaseUrl)(url);
        const pagination = $('.pagination_noscript');
        const nextPageUrl = (_a = $('.s-is-active', pagination).next()) === null || _a === void 0 ? void 0 : _a.attr('href');
        if (nextPageUrl) {
            return baseUrl + nextPageUrl;
        }
    }
    addItems($, idUrls, url) {
        $('#productListLoader')
            .find('.product-list-item')
            .each((i, element) => {
            if ($(element).attr('widget-data')) {
                const widgetData = JSON.parse($(element).attr('widget-data'));
                if ((widgetData === null || widgetData === void 0 ? void 0 : widgetData.url) && (widgetData === null || widgetData === void 0 ? void 0 : widgetData.productId)) {
                    let url = widgetData.url;
                    if (!(0, utils_1.isValidURL)(widgetData.url))
                        url = (0, utils_1.getBaseUrl)(widgetData.ua) + widgetData.url;
                    idUrls[widgetData.productId] = url;
                }
            }
        });
    }
    getSubLinks($, url) {
        let subLinkUrls = [];
        $('.category-list .category-list-item-wrap').each((i, element) => {
            let subLink = $(element).find('a').attr('href');
            if (subLink) {
                subLinkUrls.push(subLink);
            }
        });
        return subLinkUrls;
    }
    isAdModified(currentItem, previousItem) {
        return (0, homeAppliences_common_1.isChangedHomeAppliences)(currentItem, previousItem);
    }
    isAdRemoved($) {
        const widgetContainer = $('#productPage').attr('widget-data') ||
            $('.c-product').attr('widget-data');
        if (!widgetContainer) {
            return true;
        }
        return false;
    }
    scrapeHomeAppliancesItem($, url) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        let item = {};
        const widgetContainer = $('#productPage').attr('widget-data') ||
            $('.c-product').attr('widget-data');
        const widgetObject = JSON.parse(widgetContainer);
        item.title = (_a = $('h1:first').text()) === null || _a === void 0 ? void 0 : _a.trim();
        item.sourceId = widgetObject.productId;
        item.manufacturer = (_b = $('.product-info__manufacturer').text()) === null || _b === void 0 ? void 0 : _b.trim();
        item.brand = (0, utils_1.getNodeText)($('.c-product__brand'));
        item.productCode = widgetObject.productId;
        $('script').each((i, elem) => {
            var _a, _b, _c, _d;
            if ((_b = (_a = elem.children[0]) === null || _a === void 0 ? void 0 : _a.data.match(/\"productBarcode\":\s*\"(.*?)\",/)) === null || _b === void 0 ? void 0 : _b[1]) {
                item.barcode = (_d = (_c = elem.children[0]) === null || _c === void 0 ? void 0 : _c.data.match(/\"productBarcode\":\s*\"(.*?)\",/)) === null || _d === void 0 ? void 0 : _d[1];
            }
        });
        const categories = $('#breadCrumbs').find('li');
        if (categories.length > 0) {
            item.category = (_c = $(categories[1]).text()) === null || _c === void 0 ? void 0 : _c.trim();
            item.subcategory = (_d = $(categories[2]).text()) === null || _d === void 0 ? void 0 : _d.trim();
            item.subsubcategory = (_e = $(categories[3]).text()) === null || _e === void 0 ? void 0 : _e.trim();
            item.subsubsubcategory = (_f = $(categories[4]).text()) === null || _f === void 0 ? void 0 : _f.trim();
        }
        $('.details-table')
            .find('tr')
            .each((i, element) => {
            var _a, _b;
            const label = (_a = $('td', element).first()) === null || _a === void 0 ? void 0 : _a.text().trim();
            const value = (_b = $('td', element).last()) === null || _b === void 0 ? void 0 : _b.text().trim();
            for (let key in this.labelTranslations) {
                if ((0, utils_1.matchLabelTranslation)(label, this.labelTranslations[key], true)) {
                    if (!item[key]) {
                        if (key == 'dimensions' && value.includes(`''`)) {
                            item[key] = value.replace(`''`, ` inch`);
                        }
                        else if (key == 'dimensions' &&
                            value.includes(`'`)) {
                            item[key] = value.replace(`'`, ` feet`);
                        }
                        else {
                            item[key] = value;
                        }
                    }
                }
            }
        });
        let productPrices = JSON.stringify(widgetObject);
        // Widget only holds sell_price, price hidden in JS
        // stringify and extract incase nesting of attribute in object changes
        // scraping with classes not a stable option
        let primaryPrice = (_h = (_g = productPrices.match(/\"sell_price\":\s*\"(.*?)\",/)) === null || _g === void 0 ? void 0 : _g[1]) !== null && _h !== void 0 ? _h : '0';
        let secondaryPriceEl = (_j = $('.c-price.h-price--small', '.c-product__price-box')) === null || _j === void 0 ? void 0 : _j.contents().filter((_, el) => el.nodeType === 3).text().trim();
        let secondaryPricefloatEl = (_k = $('.c-price.h-price--small sup', '.c-product__price-box')) === null || _k === void 0 ? void 0 : _k.contents().text().trim();
        let secondaryPrice;
        if (secondaryPriceEl) {
            secondaryPrice =
                secondaryPriceEl +
                    (secondaryPricefloatEl ? '.' + secondaryPricefloatEl : '');
        }
        if (secondaryPrice) {
            item.discountPrice = primaryPrice;
            item.price = secondaryPrice;
        }
        else {
            item.price = primaryPrice;
        }
        item.finalPrice = primaryPrice;
        item.inStock = Boolean($('div[data-cy="product-page-add-to-cart"]').length);
        item.meta = {};
        return item;
    }
    testing(autoLunch) {
        return __awaiter(this, void 0, void 0, function* () {
            return new sample_1.PGUTesting(autoLunch);
        });
    }
}
exports.PGUFunctions = PGUFunctions;
//# sourceMappingURL=functions.js.map