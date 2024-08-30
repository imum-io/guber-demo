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
exports.TOPFunctions = void 0;
const query_string_1 = __importDefault(require("query-string"));
const sample_1 = require("./sample");
const utils_1 = require("../../utils");
const homeAppliences_common_1 = require("../../common/homeAppliences-common");
class TOPFunctions {
    constructor() {
        this.labelTranslations = {
            brand: {
                lt: 'Prekės ženklas',
            },
            model: {
                lt: 'Modelis',
            },
            width: {
                lt: 'Plotis'
            },
            height: {
                lt: 'Aukštis'
            },
            depth: {
                lt: 'Gylis'
            },
            weight: {
                lt: 'Sausų skalbinių kiekis'
            },
            color: {
                lt: 'Spalva'
            },
            length: {
                lt: 'Ilgis'
            },
            power: {
                lt: 'Galia'
            },
            dimensions: {
                lt: 'Matmenys'
            }
        };
    }
    isJson(vehicleType, url) {
        return url.includes("topocentras.lt/graphql");
    }
    getNextPageUrlJson(json, url) {
        const split = url.split('?');
        const params = query_string_1.default.parse(split[1]);
        let vars;
        if (typeof params.vars == 'string') {
            vars = JSON.parse(params.vars);
        }
        if (((vars.pageSize * vars.currentPage) < json.data.products.total_count) && vars) {
            vars.currentPage = vars.currentPage + 1;
            return `${split[0]}?${query_string_1.default.stringify(Object.assign(Object.assign({}, params), { vars: JSON.stringify(vars) }))}`;
        }
        return undefined;
    }
    addItemsJson(response, idUrls, url) {
        let products = response.data.products.items;
        for (let product of products) {
            if (product.id && product.url_key) {
                idUrls[product.id] = `https://www.topocentras.lt/graphql?query=ROOT_GetProduct&vars={"id":"${product.id}"}`;
            }
        }
    }
    scrapeHomeAppliancesJson(response, url) {
        var _a, _b, _c, _d, _e, _f, _g;
        const item = {};
        const productDetail = (_a = response.data.productDetail) === null || _a === void 0 ? void 0 : _a.items[0];
        item.title = productDetail === null || productDetail === void 0 ? void 0 : productDetail.name;
        item.sourceId = (_b = productDetail === null || productDetail === void 0 ? void 0 : productDetail.id) === null || _b === void 0 ? void 0 : _b.toString();
        item.price = this.checkZero((_d = (_c = productDetail === null || productDetail === void 0 ? void 0 : productDetail.price_range.maximum_price) === null || _c === void 0 ? void 0 : _c.regular_price) === null || _d === void 0 ? void 0 : _d.value) || 0;
        item.discountPrice = this.checkZero(productDetail === null || productDetail === void 0 ? void 0 : productDetail.special_price);
        item.discountType = (_g = (_f = (_e = productDetail === null || productDetail === void 0 ? void 0 : productDetail.price_range) === null || _e === void 0 ? void 0 : _e.maximum_price) === null || _f === void 0 ? void 0 : _f.discount) === null || _g === void 0 ? void 0 : _g.__typename;
        item.memberPrice = this.checkZero(productDetail === null || productDetail === void 0 ? void 0 : productDetail.topo_club_price);
        if (item.discountPrice == item.price) {
            item.discountPrice = undefined;
        }
        item.inStock = (productDetail === null || productDetail === void 0 ? void 0 : productDetail.stock_status) === 'IN_STOCK';
        item.finalPrice = item.discountPrice || item.memberPrice || item.price;
        item.brand = productDetail === null || productDetail === void 0 ? void 0 : productDetail.brand;
        item.model = productDetail === null || productDetail === void 0 ? void 0 : productDetail.manufacturer_code;
        item.barcode = productDetail === null || productDetail === void 0 ? void 0 : productDetail.barcode;
        item.productCode = productDetail === null || productDetail === void 0 ? void 0 : productDetail.sku;
        for (const feature of productDetail === null || productDetail === void 0 ? void 0 : productDetail.visible_on_front) {
            const label = feature.label;
            const value = feature.value;
            for (let key in this.labelTranslations) {
                if ((0, utils_1.matchLabelTranslation)(label, this.labelTranslations[key], true)) {
                    if (!item[key]) {
                        item[key] = value;
                        if (key == 'width' || key == 'height' || key == 'depth' || key == 'length') {
                            item[key] = (Number(item[key]) * 10).toString();
                        }
                    }
                }
            }
        }
        const category = productDetail === null || productDetail === void 0 ? void 0 : productDetail.categories.find(category => category.breadcrumbs);
        if (category) {
            if (category.breadcrumbs.length >= 3) {
                item.subsubsubcategory = category.name;
                item.subsubcategory = category.breadcrumbs[2].category_name;
                item.subcategory = category.breadcrumbs[1].category_name;
                item.category = category.breadcrumbs[0].category_name;
            }
            else if (category.breadcrumbs.length == 2) {
                item.subsubcategory = category.name;
                item.subcategory = category.breadcrumbs[1].category_name;
                item.category = category.breadcrumbs[0].category_name;
            }
            else if (category.breadcrumbs.length == 1) {
                item.subcategory = category.name;
                item.category = category.breadcrumbs[0].category_name;
            }
            else if (category.breadcrumbs.length > 0) {
                item.category = category.name;
            }
        }
        item.extendedUrl = `https://www.topocentras.lt/${productDetail === null || productDetail === void 0 ? void 0 : productDetail.url_key}.html`;
        item.meta = {};
        return item;
    }
    isAdRemovedJson(json) {
        var _a, _b, _c;
        return Boolean(((_c = (_b = (_a = json === null || json === void 0 ? void 0 : json.data) === null || _a === void 0 ? void 0 : _a.productDetail) === null || _b === void 0 ? void 0 : _b.items) === null || _c === void 0 ? void 0 : _c.length) === 0);
    }
    isAdModified(currentItem, previousItem) {
        return (0, homeAppliences_common_1.isChangedHomeAppliences)(currentItem, previousItem);
    }
    checkZero(price) {
        let priceString;
        if (price && price != 0) {
            priceString = price.toFixed(2);
        }
        return priceString;
    }
    testing(autoLunch = true) {
        return __awaiter(this, void 0, void 0, function* () {
            return new sample_1.TOPTesting(autoLunch);
        });
    }
}
exports.TOPFunctions = TOPFunctions;
//# sourceMappingURL=functions.js.map