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
exports.MDEFunctions = void 0;
const utils_1 = require("../../utils");
const html2plaintext_1 = __importDefault(require("html2plaintext"));
const query_string_1 = __importDefault(require("query-string"));
const enums_1 = require("../../config/enums");
const moment_1 = __importDefault(require("moment"));
const sample_1 = require("./sample");
const common_1 = require("../../common");
const url_1 = __importDefault(require("url"));
class MDEFunctions {
    constructor() {
        this.baseUrl = 'https://suchen.mobile.de';
        this.headers = {
            'Accept-Language': 'en-us',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': '*/*',
            'Connection': 'keep-alive',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
            // 'Cookie': 'mobile.LOCALE=en',
        };
        this.cookies = {
            name: "mobile.LOCALE",
            value: "en",
            path: "/",
            domain: ".mobile.de",
            expires: (0, moment_1.default)().add(1, 'years').unix(),
        };
        this.useHeadless = false;
    }
    supportScrapeList(vehicleType) {
        return true;
    }
    isJson(vehicleType, url) {
        return true;
    }
    updateUrl(url) {
        let extendedUrl = url;
        if (!url.includes('m.mobile.de/svc')) {
            const parsedUrl = url_1.default.parse(url, true);
            const params = parsedUrl.query;
            if (params.id) {
                extendedUrl = `https://m.mobile.de/svc/a/${params.id}?_no-call-tracker=true`;
            }
            else {
                extendedUrl = 'https://m.mobile.de/svc/s/?top&ps=0&tic&psz=20&' + url.split('?')[1];
            }
        }
        return extendedUrl;
    }
    supportsType(vehicleType) {
        return vehicleType == enums_1.vehicleTypes.trailer || vehicleType == enums_1.vehicleTypes.images || vehicleType == enums_1.vehicleTypes.car || vehicleType == enums_1.vehicleTypes.truck;
    }
    idFromUrl(name, url) {
        if (!url)
            url = location.href;
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(url);
        return results == null ? null : results[1];
    }
    // ---------------------------------------Get Ads count------------------------------------------
    getAdsCount($) {
        //check if there is a json object in the body
        let totalPages, totalAds;
        if ($ && $.numResultsTotal != undefined) {
            totalAds = $.numResultsTotal;
        }
        else {
            const searchResultHeadline = $('.cBox-body h1').text();
            totalAds = searchResultHeadline.split(' ')[0];
            const selectors = Array.from($("ul.pagination li"));
            if ((selectors === null || selectors === void 0 ? void 0 : selectors.length) > 0) {
                let totalPagesIndex = selectors.length - 1;
                totalPages = Number($(`ul.pagination li:nth-child(${totalPagesIndex})`).text());
            }
        }
        return { totalAds: Number(totalAds), totalPages };
    }
    // ---------------------------------------Fetch urls------------------------------------------
    getNextPageUrl($) {
        let container = $('li.pref-next');
        if (container.length > 0) {
            return $('span.next-resultitems-page', container).attr('data-href');
        }
        else {
            let urlElement = (0, utils_1.findElementByText)($, 'li', 'Further offers');
            if (urlElement) {
                return this.baseUrl + $('a', urlElement).attr('href');
            }
        }
        return undefined;
    }
    getNextPageUrlJson(json, url) {
        var _a;
        if (!json.numResultsTotal || !json.items || ((_a = json.items) === null || _a === void 0 ? void 0 : _a.length) == 0) {
            return undefined;
        }
        if (url && !url.includes('m.mobile.de/svc')) {
            url = 'https://m.mobile.de/svc/s/?top&ps=0&tic&psz=20&' + url.split('?')[1];
        }
        let split = url.split('?');
        let params = query_string_1.default.parse(split[1]);
        let shift = parseInt(params.ps) + parseInt(params.psz);
        let finalShift = Math.min(shift, parseInt(json.numResultsTotal) - parseInt(params.psz));
        if (finalShift < 0 || parseInt(params.ps) === finalShift) {
            return undefined;
        }
        params.ps = finalShift;
        return split[0] + "?" + query_string_1.default.stringify(params);
    }
    addItems($, idUrls) {
        if ($('li.pref-next').length > 0) {
            // If we have proper classes, use this optimized code
            $('a.result-item', '.cBox--resultList').each((i, elem) => {
                let itemUrl = $(elem).attr('href');
                let id = this.idFromUrl('id', itemUrl);
                idUrls[id] = itemUrl;
            });
        }
        else {
            // Classes are generated, search by text
            let container = $((0, utils_1.findElementByText)($, 'h3', 'Matching offers')).next();
            $('section', container).map((i, elem) => {
                let itemUrl = this.baseUrl + $('a', elem).attr('href');
                let id = this.idFromUrl('id', itemUrl);
                idUrls[id] = itemUrl;
            });
        }
    }
    addItemsJson(json, idUrls, url) {
        if (json.items) {
            json.items.forEach(item => {
                let scrapedItem;
                const parsedUrl = url_1.default.parse(url, true);
                const params = parsedUrl.query;
                if (params.vc == 'SemiTrailer') {
                    scrapedItem = this.scrapeTrailerJson(item);
                }
                else if (params.vc == 'SemiTrailerTruck') {
                    scrapedItem = this.scrapeTruckJson(item);
                }
                else {
                    scrapedItem = this.scrapeCarJson(item);
                }
                scrapedItem.url = `https://m.mobile.de/svc/a/${item.id}?_no-call-tracker=true`;
                idUrls[item.id] = scrapedItem;
            });
        }
    }
    // ---------------------------------------Fetch items------------------------------------------
    isAdModified(currentItem, previousItem) {
        return (0, common_1.isChangedVehicles)(previousItem, currentItem);
    }
    isAdRemovedJson(jsonData) {
        var _a;
        let removedError = (_a = jsonData.errors) === null || _a === void 0 ? void 0 : _a.find((err) => err.key == 'entity.not-found');
        if (removedError) {
            return true;
        }
        return false;
    }
    isAdRemoved($) {
        return Boolean($.html().match(/errorType/));
    }
    scrapeTrailerItem($, url) {
        var _a, _b, _c;
        let item = {};
        // let titleArea = $('div.cBox-body--title-area')
        item.title = (_b = (_a = $('h1#ad-title').first()) === null || _a === void 0 ? void 0 : _a.text()) === null || _b === void 0 ? void 0 : _b.trim();
        item.priceNet = $('[data-testid="sec-price"]').first().text();
        item.priceGross = $('[data-testid="prime-price"]').first().text();
        item.vat = (_c = $('[data-testid="vat"]').first()) === null || _c === void 0 ? void 0 : _c.text();
        let technicalData = $('div.cBox-body--technical-data');
        item.category = $('#category-v', technicalData).text();
        item.vehiclenumber = $('#sku-v', technicalData).text();
        item.availability = $('#availability-v', technicalData).text();
        item.firstReg = $('#firstRegistration-v', technicalData).text();
        item.constructionYear = $('#constructionYear-v', technicalData).text();
        item.licensedWeight = $('#licensedWeight-v', technicalData).text();
        item.hu = $('#hu-v', technicalData).text();
        item.axles = $('#axles-v', technicalData).text();
        item.europalletStorageSpaces = $('#europalletStorageSpaces-v', technicalData).text();
        item.loadCapacity = $('#loadCapacity-v', technicalData).text();
        item.shippingVolume = $('#shippingVolume-v', technicalData).text();
        item.vehicleWidth = $('#vehicleWidth-v', technicalData).text();
        item.vehicleHeight = $('#vehicleHeight-v', technicalData).text();
        item.loadingSpaceLength = $('#loadingSpaceLength-v', technicalData).text();
        item.loadingSpaceWidth = $('#loadingSpaceWidth-v', technicalData).text();
        item.loadingSpaceHeight = $('#loadingSpaceHeight-v', technicalData).text();
        item.seller = $('#dealer-hp-link-bottom').text();
        let address = $('#db-address').html();
        let addresses = address.split('<br>');
        item.address = (0, html2plaintext_1.default)(addresses.join(', '));
        item.countryCode = '';
        if (addresses.length > 1 && addresses[1].length > 1) {
            item.countryCode = addresses[1].substring(0, 2); // TODO: export country
        }
        // Extract features
        let features = "";
        $('div.bullet-list', '#features').each((i, elem) => {
            features += (i != 0 ? ';' : '') + $(elem).text();
        });
        item.features = features;
        item.description = $('.cBox-body--vehicledescription').text();
        item.descriptionHTML = $('.cBox-body--vehicledescription').html();
        item.imageUrls = [];
        $('img', '.cycle-slideshow').each((i, elem) => {
            let url = $(elem).attr('data-lazy') || $(elem).attr('src');
            if (url && url.includes('//')) {
                url = url.replace('//', 'https://');
                item.imageUrls.push(url);
            }
        });
        // let titleArea = $('h2')
        // item.title = getNodeText(titleArea)
        // item.priceNet = titleArea.next().text().split('Net')[0].trim()
        // item.features = ""
        // $('section').each((i, block) => {
        //     const blockTitle = getNodeText($('h3', block))
        //     if (matchRegex(blockTitle, /(?:Technical data)/i)) {
        //         $('dt', block).each((i, elem) => {
        //             const label = getNodeText($(elem))
        //             let value
        //             const valueElem = $(elem).next()
        //             if (valueElem) {
        //                 value = valueElem.text().trim()
        //             }
        //             if (matchRegex(label, /(?:Price)/i)) {
        //                 item.priceGross = value
        //             }
        //             if (label === 'HU') {
        //                 item.hu = value
        //             }
        //             else if (matchRegex(label, /(?:Category)/i)) {
        //                 item.category = value
        //             }
        //             else if (matchRegex(label, /(?:First Registration)/i)) {
        //                 item.firstReg = value
        //             }
        //             else if (matchRegex(label, /(?:Construction Year)/i)) {
        //                 item.constructionYear = value
        //             }
        //             else if (matchRegex(label, /(?:GVW)/i)) {
        //                 item.licensedWeight = value
        //             }
        //             else if (matchRegex(label, /(?:Colour)/i)) {
        //                 item.color = value
        //             }
        //             else if (matchRegex(label, /(?:Axles)/i)) {
        //                 item.axles = value
        //             }
        //             else if (matchRegex(label, /(?:Europallet Storage Spaces)/i)) {
        //                 item.europalletStorageSpaces = value
        //             }
        //             else if (matchRegex(label, /(?:Load Capacity)/i)) {
        //                 item.loadCapacity = value
        //             }
        //             else if (matchRegex(label, /(?:Shipping Volume)/i)) {
        //                 item.shippingVolume = value
        //             }
        //             else if (matchRegex(label, /(?:Vehicle Width)/i)) {
        //                 item.vehicleWidth = value
        //             }
        //             else if (matchRegex(label, /(?:Vehicle Height)/i)) {
        //                 item.vehicleHeight = value
        //             }
        //             else if (matchRegex(label, /(?:Loading Space Length)/i)) {
        //                 item.loadingSpaceLength = value
        //             }
        //             else if (matchRegex(label, /(?:Loading Space Width)/i)) {
        //                 item.loadingSpaceWidth = value
        //             }
        //             else if (matchRegex(label, /(?:Loading Space Height)/i)) {
        //                 item.loadingSpaceHeight = value
        //             }
        //         })
        //     }
        //     else if (matchRegex(blockTitle, /(?:Feature Sets)/i)) {
        //         $('li', block).each((i, elem) => {
        //             const label = getNodeText($(elem))
        //             if (item.features.length > 0) item.features += ';'
        //             item.features += label
        //         })
        //     }
        //     else if (matchRegex(blockTitle, /(?:Vehicle Description)/i)) {
        //         item.description = removeExtraWhitespace($(block).text())
        //         item.descriptionHTML = $(block).html()
        //     }
        //     else if (blockTitle === 'Dealer') {
        //         let sellerElem = $('h4', block)
        //         item.seller = getNodeText(sellerElem)
        //         let addressElem = sellerElem.parent().parent().next().next()
        //         item.address = removeExtraWhitespace(getNodeText(addressElem))
        //         let countryElem = $(addressElem.children()[1])
        //         item.countryCode = getNodeText(countryElem).split('-')[0]
        //     }
        // })
        return item;
    }
    scrapeTrailerJson(jsonData) {
        let item = {};
        item.title = jsonData.title;
        let price = jsonData.price;
        let priceGross = price.grs;
        let priceNet = price.nt;
        if (priceGross != null) {
            item.priceGross = priceGross['localized'];
        }
        if (priceNet != null) {
            item.priceNet = priceNet['localized'];
        }
        item.vat = jsonData.vat;
        if (jsonData.attributes) {
            for (let attribute of jsonData.attributes) {
                if ((0, utils_1.matchRegex)(attribute.tag, /(?:category)/i)) {
                    item.category = attribute.value; //
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:sku)/i)) {
                    item.vehiclenumber = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:availability)/i)) {
                    item.availability = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:firstRegistration)/i)) {
                    item.firstReg = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:constructionYear)/i)) {
                    item.constructionYear = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:licensedWeight)/i)) {
                    item.licensedWeight = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:hu)/i)) {
                    item.hu = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:axles)/i)) {
                    item.axles = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:europalletStorageSpaces)/i)) {
                    item.europalletStorageSpaces = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:loadCapacity)/i)) {
                    item.loadCapacity = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:shippingVolume)/i)) {
                    item.shippingVolume = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:vehicleWidth)/i)) {
                    item.vehicleWidth = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:vehicleHeight)/i)) {
                    item.vehicleHeight = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:loadingSpaceLength)/i)) {
                    item.loadingSpaceLength = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:loadingSpaceWidth)/i)) {
                    item.loadingSpaceWidth = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:loadingSpaceHeight)/i)) {
                    item.loadingSpaceHeight = attribute.value;
                }
            }
        }
        let contact = jsonData.contact;
        if ((0, utils_1.matchRegex)(contact.enumType, /(?:DEALER)/i)) {
            item.seller = contact.name;
            item.address = contact.address1 + ',' + contact.address2;
            item.countryCode = contact.country;
        }
        let feature = jsonData.features;
        let features = "";
        if (feature && feature.length != 0) {
            for (let i = 0; i < feature.length; i++) {
                features = features + ", " + feature[i];
            }
            item.features = features;
        }
        item.description = jsonData.htmlDescription ? jsonData.htmlDescription.replace(/(<([^>]+)>)/ig, '') : '';
        item.extendedUrl = jsonData.url;
        return item;
    }
    scrapeTruckItem($) {
        var _a, _b, _c;
        let item = {};
        // let titleArea = $('div.cBox-body--title-area')
        item.title = (_b = (_a = $('h1#ad-title').first()) === null || _a === void 0 ? void 0 : _a.text()) === null || _b === void 0 ? void 0 : _b.trim();
        item.priceNet = $('[data-testid="sec-price"]').first().text();
        item.priceGross = $('[data-testid="prime-price"]').first().text();
        item.vat = (_c = $('[data-testid="vat"]').first()) === null || _c === void 0 ? void 0 : _c.text();
        let technicalData = $('div.cBox-body--technical-data');
        item.category = $('#category-v', technicalData).text();
        item.mileage = $('#mileage-v', technicalData).text();
        item.capacity = $('#cubicCapacity-v', technicalData).text();
        item.power = $('#power-v', technicalData).text();
        item.fuel = $('#fuel-v', technicalData).text();
        item.hu = $('#hu-v', technicalData).text();
        item.transmission = $('#transmission-v', technicalData).text();
        item.emissionClass = $('#emissionClass-v', technicalData).text();
        item.firstReg = $('#firstRegistration-v', technicalData).text();
        item.constructionYear = $('#constructionYear-v', technicalData).text();
        item.licensedWeight = $('#licensedWeight-v', technicalData).text();
        item.climatisation = $('#climatisation-v', technicalData).text();
        item.color = $('#color-v', technicalData).text();
        item.axles = $('#axles-v', technicalData).text();
        item.wheelFormula = $('#wheelFormula-v', technicalData).text();
        item.drivingCab = $('#drivingCab-v', technicalData).text();
        item.seller = $('#dealer-hp-link-bottom').text();
        let address = $('#db-address').html();
        // let address = $('#seller-address').html()
        let addresses = address.split('<br>');
        item.address = (0, html2plaintext_1.default)(addresses.join(', '));
        item.countryCode = '';
        if (addresses.length > 1 && addresses[1].length > 1) {
            item.countryCode = addresses[1].substring(0, 2); // TODO: export country
        }
        // Extract features
        let features = "";
        $('div.bullet-list', '#features').each((i, elem) => {
            features += (i != 0 ? ';' : '') + $(elem).text();
        });
        item.features = features;
        item.description = $('.cBox-body--vehicledescription').text();
        item.descriptionHTML = $('.cBox-body--vehicledescription').html();
        // If no proper classes
        // let titleArea = $('h2')
        // item.title = getNodeText(titleArea)
        // item.priceNet = titleArea.next().text().split('Net')[0].trim()
        // item.features = ""
        // $('section').each((i, block) => {
        //     const blockTitle = getNodeText($('h3', block))
        //     if (matchRegex(blockTitle, /(?:Technical data)/i)) {
        //         $('dt', block).each((i, elem) => {
        //             const label = getNodeText($(elem))
        //             let value
        //             const valueElem = $(elem).next()
        //             if (valueElem) {
        //                 value = valueElem.text().trim()
        //             }
        //             if (matchRegex(label, /(?:Price)/i)) {
        //                 item.priceGross = value
        //             }
        //             if (label === 'HU') {
        //                 item.hu = value
        //             }
        //             else if (matchRegex(label, /(?:Category)/i)) {
        //                 item.category = value
        //             }
        //             else if (matchRegex(label, /(?:Mileage)/i)) {
        //                 item.mileage = value
        //             }
        //             else if (matchRegex(label, /(?:Cubic Capacity)/i)) {
        //                 item.capacity = value
        //             }
        //             else if (matchRegex(label, /(?:Power)/i)) {
        //                 item.power = value
        //             }
        //             else if (matchRegex(label, /(?:Fuel)/i)) {
        //                 item.fuel = value
        //             }
        //             else if (matchRegex(label, /(?:Gearbox)/i)) {
        //                 item.transmission = value
        //             }
        //             else if (matchRegex(label, /(?:Emission Class)/i)) {
        //                 item.emissionClass = value
        //             }
        //             else if (matchRegex(label, /(?:First Registration)/i)) {
        //                 item.firstReg = value
        //             }
        //             else if (matchRegex(label, /(?:Construction Year)/i)) {
        //                 item.constructionYear = value
        //             }
        //             else if (matchRegex(label, /(?:GVW)/i)) {
        //                 item.licensedWeight = value
        //             }
        //             else if (matchRegex(label, /(?:Climatisation)/i)) {
        //                 item.climatisation = value
        //             }
        //             else if (matchRegex(label, /(?:Colour)/i)) {
        //                 item.color = value
        //             }
        //             else if (matchRegex(label, /(?:Axles)/i)) {
        //                 item.axles = value
        //             }
        //             else if (matchRegex(label, /(?:Wheel Formula)/i)) {
        //                 item.wheelFormula = value
        //             }
        //             else if (matchRegex(label, /(?:Driving Cab)/i)) {
        //                 item.drivingCab = value
        //             }
        //         })
        //     }
        //     else if (matchRegex(blockTitle, /(?:Feature Sets)/i)) {
        //         $('li', block).each((i, elem) => {
        //             const label = getNodeText($(elem))
        //             if (item.features.length > 0) item.features += ';'
        //             item.features += label
        //         })
        //     }
        //     else if (matchRegex(blockTitle, /(?:Vehicle Description)/i)) {
        //         item.description = removeExtraWhitespace($(block).text())
        //         item.descriptionHTML = $(block).html()
        //     }
        //     else if (blockTitle === 'Dealer') {
        //         let sellerElem = $('h4', block)
        //         item.seller = getNodeText(sellerElem)
        //         let addressElem = sellerElem.parent().parent().next().next()
        //         item.address = removeExtraWhitespace(getNodeText(addressElem))
        //         let countryElem = $(addressElem.children()[1])
        //         item.countryCode = getNodeText(countryElem).split('-')[0]
        //     }
        // })
        return item;
    }
    scrapeTruckJson(jsonData) {
        let item = {};
        item.title = jsonData.title;
        let price = jsonData.price;
        let priceGross = price.grs;
        let priceNet = price.nt;
        if (priceGross != null) {
            item.priceGross = priceGross['localized'];
        }
        if (priceNet != null) {
            item.priceNet = priceNet['localized'];
        }
        item.vat = jsonData.vat;
        if (jsonData.attributes) {
            for (let attribute of jsonData.attributes) {
                if ((0, utils_1.matchRegex)(attribute.tag, /(?:category)/i)) {
                    item.category = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:mileage)/i)) {
                    item.mileage = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:cubicCapacity)/i)) {
                    item.capacity = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:power)/i)) {
                    item.power = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:fuel)/i)) {
                    item.fuel = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:hu)/i)) {
                    item.hu = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:transmission)/i)) {
                    item.transmission = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:emissionClass)/i)) {
                    item.emissionClass = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:firstRegistration)/i)) {
                    item.firstReg = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:constructionYear)/i)) {
                    item.constructionYear = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:licensedWeight)/i)) {
                    item.licensedWeight = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:climatisation)/i)) {
                    item.climatisation = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:color)/i)) {
                    item.color = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:axles)/i)) {
                    item.axles = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:wheelFormula)/i)) {
                    item.wheelFormula = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:drivingCab)/i)) {
                    item.drivingCab = attribute.value;
                }
            }
        }
        let contact = jsonData.contact;
        if ((0, utils_1.matchRegex)(contact.enumType, /(?:DEALER)/i)) {
            item.seller = contact.name;
            item.address = contact.address1 + ',' + contact.address2;
            item.countryCode = contact.country;
        }
        let feature = jsonData.features;
        let features = "";
        if (feature && feature.length != 0) {
            for (let i = 0; i < feature.length; i++) {
                features = features + ", " + feature[i];
            }
            item.features = features;
        }
        item.description = jsonData.htmlDescription ? jsonData.htmlDescription.replace(/(<([^>]+)>)/ig, '') : '';
        item.extendedUrl = jsonData.url;
        return item;
    }
    getConsumptionVal(value, key) {
        if (!value || !value.includes(key)) {
            return null;
        }
        value = value.split(key)[0];
        if (value.includes('.')) {
            value = value.split('.')[1];
        }
        return value;
    }
    scrapeCarItem($) {
        let item = {};
        let titleArea = $('div.cBox-body--title-area');
        item.title = $('#rbt-ad-title', titleArea).text();
        // let pricePrime = $('.rbt-prime-price', titleArea).text()
        // let priceSec = $('.rbt-sec-price', titleArea).text()
        // if (pricePrime && pricePrime.includes("brutto")) {
        //     item.priceGross = pricePrime
        //     item.priceNet = priceSec
        // }
        item.priceGross = $('.rbt-prime-price', titleArea).text();
        item.priceNet = $('.rbt-sec-price', titleArea).text();
        item.vat = $('.rbt-vat', titleArea).text();
        let technicalData = $('div.cBox-body--technical-data');
        item.category = $('#rbt-category-v', technicalData).text();
        item.numSeats = $('#rbt-numSeats-v', technicalData).text();
        item.numDoors = $('#rbt-doorCount-v', technicalData).text();
        item.slidingDoor = $('#rbt-slidingDoor-v', technicalData).text();
        item.mileage = $('#rbt-mileage-v', technicalData).text();
        item.capacity = $('#rbt-cubicCapacity-v', technicalData).text();
        item.power = $('#rbt-power-v', technicalData).text();
        item.battery = $('#rbt-battery-v', technicalData).text();
        item.fuel = $('#rbt-fuel-v', technicalData).text();
        item.hu = $('#rbt-hu-v', technicalData).text();
        item.transmission = $('#rbt-transmission-v', technicalData).text();
        item.emissionClass = $('#rbt-emissionClass-v', technicalData).text();
        item.parkSensors = $('#rbt-parkAssists-v', technicalData).text();
        item.climatisation = $('#rbt-climatisation-v', technicalData).text();
        item.airbags = $('#rbt-airbag-v', technicalData).text();
        item.firstReg = $('#rbt-firstRegistration-v', technicalData).text();
        item.constructionYear = $('#rbt-constructionYear-v', technicalData).text();
        // ------------OTHER INFO------------
        item.emissionsSticker = $('#rbt-emissionsSticker-v', technicalData).text();
        item.numOwners = $('#rbt-numberOfPreviousOwners-v', technicalData).text();
        let co2 = $('#rbt-envkv\\.emission-v', technicalData).text();
        item.co2 = (0, utils_1.getConsumptionVal)(co2, 'g/km');
        item.powerConsumption = (0, utils_1.getConsumptionVal)($('#rbt-envkv\\.powerConsumption-v', technicalData).text(), 'kWh');
        item.vehicleNum = $('#rbt-sku-v', technicalData).text();
        // Fuel consumption (combined)
        // Fuel consumption (urban))
        // Fuel consumption (extra-urban)
        let consumptionData = $('#rbt-envkv\\.consumption-v', technicalData);
        $('div', consumptionData).each((i, elem) => {
            let value = $(elem).text();
            if (!value.includes('l/')) {
                // Something's wrong, unexpected consumption value
                return;
            }
            let processedValue = (0, utils_1.getConsumptionVal)(value, 'l/');
            if (value.includes("combined")) {
                item.consumption = processedValue;
            }
            else if (value.includes("extra-urban")) {
                item.consumptionExtra = processedValue;
            }
            else if (value.includes("urban")) {
                item.consumptionUrban = processedValue;
            }
        });
        // item.consumption = $('#rbt-envkv.consumption-v', technicalData)
        item.vehicleCondition = $('#rbt-damageCondition-v', technicalData).text();
        // Damaged vehicle (vehicle condition)
        // Approved Used Programme
        // Location country
        // Location postal code or other
        // Energy efficiency class
        // ------------CALCULATED LATER------------
        // HU validity in months
        // age_months
        // km_per_month
        // Dealer name
        // Dealer address
        // Dealer number
        // Dealer other
        item.seller = $('#dealer-details-link-top').text();
        let address = $('#rbt-seller-address').html();
        let addresses = address.split('<br>');
        item.address = (0, html2plaintext_1.default)(addresses.join(', '));
        item.countryCode = '';
        if (addresses.length > 1 && addresses[1].length > 1) {
            item.countryCode = addresses[1].substring(0, 2); // TODO: export country
        }
        // Extract features
        let features = "";
        $('div.bullet-list', '#rbt-features').each((i, elem) => {
            features += (i != 0 ? ';' : '') + $(elem).text();
        });
        item.features = features;
        // ------------FEATURES------------
        // Air conditioning
        // Winter package
        // Android Auto 
        // Bluetooth
        // Head-up display
        // Apple CarPlay
        // Wheels
        // Parking sensors
        // Sports
        // Panoramic roof
        // Sunroof
        // Interior design
        // Full service history
        // Non-smoker vehicle
        // Warranty
        // Roadworthy 
        // Navigation system
        // Traffic sign recognition 
        // Garage door opener
        item.description = $('.cBox-body--vehicledescription').text();
        item.descriptionHTML = $('.cBox-body--vehicledescription').html();
        return item;
    }
    scrapeCarJson(jsonData) {
        let item = {};
        item.title = jsonData.title;
        let price = jsonData.price;
        let priceGross = price.grs;
        let priceNet = price.nt;
        item.priceGross = undefined;
        item.priceNet = undefined;
        if (priceGross != null) {
            item.priceGross = priceGross['localized'];
        }
        if (priceNet != null) {
            item.priceNet = priceNet['localized'];
        }
        item.vat = jsonData.vat;
        if (jsonData.attributes) {
            for (let attribute of jsonData.attributes) {
                if ((0, utils_1.matchRegex)(attribute.tag, /(?:category)/i)) {
                    item.category = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:numSeats)/i)) {
                    item.numSeats = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:doorCount)/i)) {
                    item.numDoors = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:slidingDoor)/i)) {
                    item.slidingDoor = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:mileage)/i)) {
                    item.mileage = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:cubicCapacity)/i)) {
                    item.capacity = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:power)/i)) {
                    item.power = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:battery)/i)) {
                    item.battery = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:fuel)/i)) {
                    item.fuel = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:hu)/i)) {
                    item.hu = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:transmission)/i)) {
                    item.transmission = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:emissionClass)/i)) {
                    item.emissionClass = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:parkAssists)/i)) {
                    item.parkSensors = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:climatisation)/i)) {
                    item.climatisation = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:airbag)/i)) {
                    item.airbags = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:firstRegistration)/i)) {
                    item.firstReg = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:constructionYear)/i)) {
                    item.constructionYear = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:emissionsSticker)/i)) {
                    item.emissionsSticker = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:numberOfPreviousOwners)/i)) {
                    item.numOwners = attribute.value;
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:envkv.emission)/i)) {
                    item.co2 = attribute.value.replace(/ /g, '');
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:envkv.powerConsumption)/i)) {
                    item.powerConsumption = attribute.value.replace(/(<([^>]+)>)/ig, '');
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:envkv.consumption)/i)) { //prblm
                    let consumptions = attribute.value;
                    for (let value of consumptions) {
                        let processedValue = (0, utils_1.getConsumptionVal)(value, 'l/');
                        if (value.includes("combined")) {
                            item.consumption = processedValue;
                        }
                        else if (value.includes("extra-urban")) {
                            item.consumptionExtra = processedValue;
                        }
                        else if (value.includes("urban")) {
                            item.consumptionUrban = processedValue;
                        }
                    }
                }
                else if ((0, utils_1.matchRegex)(attribute.tag, /(?:damageCondition)/i)) {
                    item.vehicleCondition = attribute.value;
                }
            }
        }
        let contact = jsonData.contact;
        if ((0, utils_1.matchRegex)(contact.enumType, /(?:DEALER)/i)) {
            item.seller = contact.name;
            item.address = contact.address1 + ',' + contact.address2;
            item.countryCode = contact.country;
        }
        let feature = jsonData.features;
        let features = "";
        if (feature && feature.length != 0) {
            for (let i = 0; i < feature.length; i++) {
                features = features + ", " + feature[i];
            }
            item.features = features;
        }
        item.description = jsonData.htmlDescription ? jsonData.htmlDescription.replace(/(<([^>]+)>)/ig, '') : '';
        return item;
    }
    testing() {
        return __awaiter(this, void 0, void 0, function* () {
            new sample_1.MDEtesting();
        });
    }
}
exports.MDEFunctions = MDEFunctions;
//# sourceMappingURL=functions.js.map