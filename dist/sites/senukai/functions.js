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
exports.SNKFunctions = void 0;
const homeAppliences_common_1 = require("../../common/homeAppliences-common");
const utils_1 = require("../../utils");
const query_string_1 = __importDefault(require("query-string"));
const sample_1 = require("./sample");
class SNKFunctions {
    constructor() {
        this.headers = {};
        this.useHeadless = true;
        this.labelTranslations = {
            brand: {
                lt: 'Prekės ženklas',
            },
            model: {
                lt: 'Modelis',
            },
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
        };
    }
    getAdsCount($) {
        const pagination = $('.paginator');
        const totalPages = $('.paginator__last > a', pagination).text();
        const totalAds = $('.catalog-taxons-pagination__count > b')
            .last()
            .text();
        return { totalAds: Number(totalAds), totalPages: Number(totalPages) };
    }
    getNextPageUrl($, url) {
        const noNextPage = $('.ks-inactive.ks-non-clickable.ks-next');
        if (noNextPage.length == 1) {
            return undefined;
        }
        const parsedUrl = query_string_1.default.parseUrl(url);
        parsedUrl.query.o = parsedUrl.query.o ? `${Number(parsedUrl.query.o) + 48}` : '48';
        return query_string_1.default.stringifyUrl(parsedUrl);
    }
    addItems($, idUrls, url) {
        const baseUrl = (0, utils_1.getBaseUrl)(url);
        $('.ks-catalog-taxons-product').each((i, element) => {
            const itemUrl = $(element).attr('data-sna-url');
            const sourceId = $(element).attr('data-sna-id');
            idUrls[sourceId] = baseUrl + itemUrl;
        });
    }
    getSubLinks($, url) {
        let subLinkUrls = [];
        $('.new-cat-list .new-cat-item').each((i, element) => {
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
        return Boolean($.statusCode == 404);
    }
    scrapeHomeAppliancesItem($, url) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        let item = {};
        item.title = (_a = $('h1').text()) === null || _a === void 0 ? void 0 : _a.trim();
        item.manufacturer = (_b = $('.product-info__manufacturer').text()) === null || _b === void 0 ? void 0 : _b.trim();
        item.sourceId = $('.products-comparisons-links__add-link').attr('data-compare-product-id');
        item.productCode = (_d = (_c = $('.product-id').text()) === null || _c === void 0 ? void 0 : _c.split(':')[1]) === null || _d === void 0 ? void 0 : _d.trim();
        item.barcode = $('#flix-inpage').find('script').attr('data-flix-ean');
        if (item.barcode == '') {
            item.barcode = null;
        }
        const categories = $('.breadcrumbs.breadcrumbs--collapsed').find('span');
        item.category = (_e = $(categories[3]).text()) === null || _e === void 0 ? void 0 : _e.trim();
        item.subcategory = (_f = $(categories[5]).text()) === null || _f === void 0 ? void 0 : _f.trim();
        item.subsubcategory = (_g = $(categories[7]).text()) === null || _g === void 0 ? void 0 : _g.trim();
        item.subsubsubcategory = (_h = $(categories[9]).text()) === null || _h === void 0 ? void 0 : _h.trim();
        $('.info-table')
            .find('tr')
            .each((i, element) => {
            var _a, _b;
            const label = (_a = $('td', element).first()) === null || _a === void 0 ? void 0 : _a.text().trim();
            const value = (_b = $('td', element).last()) === null || _b === void 0 ? void 0 : _b.text().trim();
            for (let key in this.labelTranslations) {
                if ((0, utils_1.matchLabelTranslation)(label, this.labelTranslations[key], true)) {
                    if (!item[key]) {
                        if (key == 'width' && value.includes('x')) {
                            item.dimensions = value;
                            let subvalues = value.split('x');
                            item.width = subvalues[0];
                            item.height = subvalues[1];
                            item.length =
                                subvalues.length > 1
                                    ? subvalues[2]
                                    : undefined;
                        }
                        else {
                            item[key] = value;
                        }
                    }
                }
            }
        });
        const productPrices = $('.detailed-product-block').first();
        item.price = $(productPrices).find('.price').find('span').first().text();
        if (!item.price) {
            $('script').each((i, elem) => {
                var _a;
                let text = $(elem).html();
                if (text.includes('http://schema.org') ||
                    text.includes('https://schema.org')) {
                    let productObject = JSON.parse(text);
                    item.price = (_a = productObject === null || productObject === void 0 ? void 0 : productObject.offers) === null || _a === void 0 ? void 0 : _a.price;
                }
            });
        }
        item.memberPrice = $('.product-price-details__loyalty-price')
            .first()
            .find('.product-price-details__price-number')
            .first()
            .text()
            .trim();
        item.finalPrice = item.memberPrice || item.discountPrice || item.price;
        let discountString = [];
        $('.products-tag-container--product-page .products-tag').each((i, element) => {
            var _a;
            let discountText = (_a = $('span.products-tag__text', element)) === null || _a === void 0 ? void 0 : _a.text();
            if (discountText) {
                discountString.push(discountText);
            }
        });
        item.discountType = discountString.join('; ') || undefined;
        item.inStock = $('.product-not-sellable-online').length ? false : true;
        item.meta = {};
        item.meta['barcode'] = {
            gtin: (_j = $('#videoly-product-gtin').text()) === null || _j === void 0 ? void 0 : _j.trim(),
            sku: (_k = $('#videoly-product-sku').text()) === null || _k === void 0 ? void 0 : _k.trim(),
            ean: item.barcode,
        };
        return item;
    }
    testing(autoLunch) {
        return __awaiter(this, void 0, void 0, function* () {
            return new sample_1.SNKTesting(autoLunch);
        });
    }
}
exports.SNKFunctions = SNKFunctions;
//# sourceMappingURL=functions.js.map