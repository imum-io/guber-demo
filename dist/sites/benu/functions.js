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
exports.BNUFunctions = void 0;
const utils_1 = require("../../utils");
const network_utils_1 = require("../../network-utils");
const cheerio_1 = __importDefault(require("cheerio"));
const sample_1 = require("./sample");
const pharmacy_common_1 = require("../../common/pharmacy-common");
const enums_1 = require("../../config/enums");
const match_rules_1 = require("../../product-matching/match-rules");
class BNUFunctions {
    constructor() {
        this.useHeadless = false;
        this.cookies = undefined;
        this.headers = {
            'Accept-Language': 'en-us',
        };
        this.quantityLeftMaxValue = 6;
        this.countryCodes = {
            lt: 'LT',
            lv: 'LV',
            ee: 'EE'
        };
        this.labelTranslations = {
            'form': {
                lt: 'Forma',
                lv: 'Forma',
                ee: 'Vorm',
            },
            'quantity': {
                lt: 'Kiekis',
                lv: 'Tilpums',
                ee: 'Mõõt',
            },
            'activeSubtance': {
                lt: 'Veikliosios medžiagos',
                lv: 'Aktīvā viela',
                ee: 'Toimeaine',
            },
            'activeSubtanceStrength': {
                lt: 'Veikliosios medžiagos stiprumas',
                lv: 'Aktīvās vielas stiprums',
                ee: 'Toimeaine sisaldus',
            },
            'manufacturer': {
                lt: 'Prekinis ženklas',
                lv: 'Zīmols',
                ee: 'Kaubamärk'
            },
            'amountInPackage': {
                lt: 'Kiekis pakuotėje',
                lv: 'Skaits iepakojumā',
                ee: 'Kogus pakis'
            },
            isRemovedText: {
                lt: 'Visos prekės',
                lv: 'E - APTIEKA',
                ee1: 'Tooted',
                ee2: 'Kaugmüüki teostab Ülemiste Tervisemaja Apteek'
            }
        };
    }
    supportsType(vehicleType) {
        return vehicleType == enums_1.vehicleTypes.images;
    }
    basicPostRequestOptions() {
        const body = new URLSearchParams();
        body.append("_intuero[appName]", "benu- eshop - lt");
        body.append("_intuero[env]", "prod");
        body.append("_intuero[mID]", '2097');
        body.append("_intuero[mType]", "productsPage");
        body.append("_intuero[lang]", "lt");
        return {
            method: 'POST',
            // uri: "https://www.benu.lt/core/defaultActions/ajax/helper.ajax.php",
            headers: {
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
            body,
        };
    }
    scrapePharmacyItemSync($, url, sourceId, quantityLeft) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        let item = {};
        item.title = (0, utils_1.getNodeText)($('.bnSingleProduct__title > h1:first'));
        $('script').each((i, elem) => {
            let text = $(elem).html();
            if (text.includes('EANCode')) {
                let startindex = text.indexOf('EANCode') + 10;
                if (text[startindex - 1] == 'n') {
                    return;
                }
                item.barcode = '';
                for (let idx = startindex; idx < text.length; idx++) {
                    if (text[idx] == `"`) {
                        break;
                    }
                    item.barcode += text[idx];
                }
            }
        });
        item.description = (0, utils_1.getNodeText)($('.col > div > #fullDescription .contentTab__content'));
        item.productUse = (0, utils_1.getNodeText)($('.col > div > #usage .contentTab__content'));
        item.composition = (0, utils_1.getNodeText)($('.col > div > #composition .contentTab__content'));
        item.category = (0, utils_1.getNodeText)($(`.bnSingleProduct__category .row div:nth-child(1)`));
        item.discountType = (_b = (_a = $('.bnProductDiscountBubble').first()) === null || _a === void 0 ? void 0 : _a.text()) === null || _b === void 0 ? void 0 : _b.trim();
        const priceWrap = $('.bnPriceBox__price').first();
        item.discountPrice = (_d = (_c = $('.price--new', priceWrap).first()) === null || _c === void 0 ? void 0 : _c.text()) === null || _d === void 0 ? void 0 : _d.trim();
        if (item.discountPrice) {
            item.price = (_f = (_e = $('.price--old', priceWrap).first()) === null || _e === void 0 ? void 0 : _e.text()) === null || _f === void 0 ? void 0 : _f.trim();
        }
        else {
            item.price = (_h = (_g = $('.pric', priceWrap).first()) === null || _g === void 0 ? void 0 : _g.text()) === null || _h === void 0 ? void 0 : _h.trim();
        }
        item.memberPrice = (_k = (_j = $('.price--card .money_amount', priceWrap).first()) === null || _j === void 0 ? void 0 : _j.text()) === null || _k === void 0 ? void 0 : _k.trim();
        // when there is no discount price, use regular price
        if (!item.price) {
            item.price = item.discountPrice;
            item.discountPrice = undefined;
        }
        item.finalPrice = item.discountPrice || item.memberPrice || item.price;
        //item.pictures
        item.other = (0, utils_1.getNodeText)($('.bnSingleProduct__description'));
        let inStockContainer = $('.bnPriceBox__addToCart');
        if ($('.bind-addToCart', inStockContainer).hasClass('bnButton--green')) {
            item.inStock = true;
        }
        else if ($('.bnPriceBox__outOfStockText')) {
            item.inStock = false;
        }
        else {
            item.inStock = null;
        }
        $('.attributesTable').find('tr').each((i, elem) => {
            let label = $(elem).find('th').text();
            let value = $(elem).find('td').text().trim();
            if ((0, utils_1.matchLabelTranslation)(label, this.labelTranslations['form'])) {
                item.form = value;
            }
            else if ((0, utils_1.matchLabelTranslation)(label, this.labelTranslations['amountInPackage'])) {
                item.amountInPackage = value;
            }
            else if ((0, utils_1.matchLabelTranslation)(label, this.labelTranslations['quantity'])) {
                item.quantity = value;
            }
            else if ((0, utils_1.matchLabelTranslation)(label, this.labelTranslations['activeSubtanceStrength'])) {
                item.activeSubstanceStrength = value;
            }
            else if ((0, utils_1.matchLabelTranslation)(label, this.labelTranslations['activeSubtance'])) {
                item.activeSubstance = value;
            }
            else if ((0, utils_1.matchLabelTranslation)(label, this.labelTranslations['manufacturer'])) {
                item.manufacturer = value;
            }
        });
        //get additional information
        let additionalInformation = {};
        let additionalInformationProperty = [];
        let additionalInformationValues = [];
        $('.contentTab__content > .attributesTable > tbody > tr > th').each((i, element) => {
            const $element = $(element);
            additionalInformationProperty.push($element.text().trim().replace(/\'/g, ""));
        });
        $('.contentTab__content > .attributesTable > tbody > tr > td').each((i, element) => {
            const $element = $(element);
            additionalInformationValues.push($element.text().trim().replace(/\'/g, ""));
        });
        additionalInformationProperty.forEach((e, i) => {
            additionalInformation[e] = (0, utils_1.jsonEscape)(additionalInformationValues[i]);
        });
        item.additionalInformation = additionalInformation;
        //get other params
        let otherParams = {};
        let otherParamsProperty = [];
        let otherParamsValues = [];
        $('.singleProduct__attributes > .attributesTable > tbody > tr > th').each((i, element) => {
            const $element = $(element);
            otherParamsProperty.push($element.text().trim().replace(/\'/g, ""));
        });
        $('.singleProduct__attributes > .attributesTable > tbody > tr > td').each((i, element) => {
            const $element = $(element);
            otherParamsValues.push($element.text().trim().replace(/\'/g, ""));
        });
        otherParamsProperty.forEach((e, i) => {
            otherParams[e] = otherParamsValues[i];
        });
        item.otherParams = otherParams;
        //item.sellerTitle
        item.suggestions = (0, utils_1.getNodeText)($('.alert__text'));
        item.deliveryInfo = (0, utils_1.getNodeText)($('.bnPriceBox__deliveryInfo'));
        //item.otherProducts
        item.countryCode = this.getCountryCode(url);
        //item.url
        item.sourceId = sourceId;
        item.quantityLeft = quantityLeft;
        item.dimensions = (0, match_rules_1.parseDimensions)(item.title);
        let imageUrls = [];
        $('.bnSingleProductGallery__image').find('img').each((indx, elem) => {
            let imageUrl = $(elem).attr('src');
            if (imageUrl) {
                imageUrl = (0, utils_1.getBaseUrl)(url) + '/' + imageUrl;
                imageUrls.push(imageUrl);
            }
        });
        item.imageUrls = imageUrls;
        return item;
    }
    scrapePharmacyItem($, url) {
        return __awaiter(this, void 0, void 0, function* () {
            let sourceId = $(".bnBoughtTogether").attr('id') || $('input[name="productData_productID"]').val();
            // let sourceId = $('input[name="productDataMass_productID"]')[0].attribs.value
            let quantityLeft = yield this.getQuantityLeftJson(sourceId, url);
            return this.scrapePharmacyItemSync($, url, sourceId, quantityLeft);
        });
    }
    getNextPageUrl(response, url) {
        let nextPageUrl;
        if (!response || response["return"]["products"].length !== 0) {
            nextPageUrl = url;
        }
        else {
            nextPageUrl = undefined;
        }
        return nextPageUrl;
    }
    hasNextPageByOptions(url) {
        return true;
    }
    getNextPageByOptions(prevPageOptions) {
        let nextPageOptions = {};
        if (prevPageOptions) {
            let pageNumber = parseInt(prevPageOptions.body.get("args[options][page]"));
            nextPageOptions = prevPageOptions;
            nextPageOptions.body.set("args[options][page]", pageNumber + 1);
        }
        else {
            nextPageOptions = this.basicPostRequestOptions();
            nextPageOptions.body.append("className", "Products");
            nextPageOptions.body.append("methodName", "loadProductsPageDraw");
            nextPageOptions.body.append("args[rules][tag][]", "");
            nextPageOptions.body.append("args[options][pageSize]", "54");
            nextPageOptions.body.append("args[options][group]", "list");
            nextPageOptions.body.append("args[options][categoryID]", "2097");
            nextPageOptions.body.append("args[options][resume]", "1");
            nextPageOptions.body.append("args[options][loadMore]", "1");
            nextPageOptions.body.append("args[options][screenWidth]", "1792");
            nextPageOptions.body.append("args[options][page]", "1");
        }
        return nextPageOptions;
    }
    isAdModified(currentItem, previousItem) {
        return (0, pharmacy_common_1.isChangedPharmacy)(currentItem, previousItem);
    }
    addItems(response, idUrls) {
        let $ = cheerio_1.default.load(response["return"]["products"]);
        const items = $('.productItem');
        items.each((i, item) => {
            const itemUrl = $(item).find('a').attr('href');
            const id = item.attribs['data-productid'];
            if (idUrls[id]) {
                console.log("already exists " + itemUrl);
            }
            idUrls[id] = itemUrl;
        });
    }
    getPostUrl(url) {
        return "https://www.benu.lt/core/defaultActions/ajax/helper.ajax.php";
    }
    isAdRemoved($) {
        const title = $('h1').text();
        return Boolean($.statusCode === 404) || (0, utils_1.matchLabelTranslation)(title, this.labelTranslations.isRemovedText);
    }
    //---------------------- helper functions------------------//
    getManufacturerTranslations() {
        return 'Prekinis ženklas';
    }
    getCountryCode(url) {
        const baseUrl = url.split('/')[2];
        const countryCodeFromUrl = baseUrl.split('.').slice(-1);
        return this.countryCodes[countryCodeFromUrl];
    }
    getQuantityLeftJson(id, url) {
        return __awaiter(this, void 0, void 0, function* () {
            let baseUrl = (0, utils_1.getBaseUrl)(url);
            let quantityLeft = {};
            const options = this.getOptionsForQuantityLeft(id);
            url = baseUrl + '/core/defaultActions/ajax/helper.ajax.php';
            const { data } = yield (0, network_utils_1.getResponseWithOptions)(url, options);
            if (data.return) {
                // Make sure item has locations
                const $ = cheerio_1.default.load(data.return);
                const rows = $("tr");
                for (let i = 0; i < rows.length; i++) {
                    let row = rows[i];
                    if (row.children.length === 1) { // contains only city name
                        const cityName = this.getCityName(row);
                        const pharmaciesObject = this.getPharmaciesForACity(rows, i);
                        quantityLeft[cityName] = pharmaciesObject.pharmacies;
                        i = pharmaciesObject.iterator - 1; // for will iterate to the next city item
                    }
                }
            }
            return quantityLeft;
        });
    }
    getOptionsForQuantityLeft(id) {
        let options = this.basicPostRequestOptions();
        options.body.append("methodName", "drawPharmaciesQnts");
        options.body.append("args[prID]", id);
        return options;
    }
    getCityName(trElement) {
        return trElement.children[0].children[0].children[0].data;
    }
    getPharmaciesForACity(rows, iterator) {
        iterator++; // move to the next row to get the details from the while block
        let row = rows[iterator];
        let pharmacies = [];
        while (row.children.length !== 1) {
            const pharmacyDetails = this.getDetailsForAPharmacy(row);
            pharmacies.push(pharmacyDetails);
            iterator++;
            if (iterator === rows.length) { // break at the last element
                break;
            }
            row = rows[iterator];
        }
        return { pharmacies, iterator };
    }
    // element has either 3 or 4 children
    getDetailsForAPharmacy(trElement) {
        var _a, _b, _c;
        let details = {};
        let positionOfLocation = 0;
        if (trElement.children.length === 4) { // first children is the city name. so skip
            positionOfLocation++;
        }
        details.location = (_a = trElement.children[positionOfLocation++]) === null || _a === void 0 ? void 0 : _a.children[0].children[0].data;
        details.updatedDate = (_b = trElement.children[positionOfLocation++]) === null || _b === void 0 ? void 0 : _b.children[0].data;
        const amountLeftString = (_c = trElement.children[positionOfLocation++]) === null || _c === void 0 ? void 0 : _c.children[0].data;
        details.surplus = (amountLeftString === null || amountLeftString === void 0 ? void 0 : amountLeftString.indexOf('+')) === 1;
        details.amountLeft = details.surplus ? this.quantityLeftMaxValue : amountLeftString === null || amountLeftString === void 0 ? void 0 : amountLeftString.match(/\d+/)[0];
        return details;
    }
    testing() {
        return __awaiter(this, void 0, void 0, function* () {
            new sample_1.BNUTesting();
        });
    }
}
exports.BNUFunctions = BNUFunctions;
//# sourceMappingURL=functions.js.map