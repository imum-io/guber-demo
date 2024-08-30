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
exports.MDEtesting = void 0;
const enums_1 = require("../../config/enums");
const logger_1 = __importDefault(require("../../libs/logger"));
const network_utils_1 = require("../../network-utils");
const sources_1 = require("../sources");
const functions_1 = require("./functions");
class MDEtesting {
    constructor() {
        this.context = {
            url: '',
            source: sources_1.sources.MDE,
            vehicleType: enums_1.vehicleTypes.trailer,
            sourceId: null,
            dbServer: enums_1.dbServers.local,
            itemId: null
        };
        this.sourceFunctions = new functions_1.MDEFunctions();
        // all test should done here. The ultimate test zone
        this.testing();
    }
    testing() {
        return __awaiter(this, void 0, void 0, function* () {
            // await this.test_ad()
            // await this.test_fetching_json_page()
            yield this.test_processor_page_parsing();
        });
    }
    test_ad() {
        return __awaiter(this, void 0, void 0, function* () {
            let url = "https://suchen.mobile.de/fahrzeuge/details.html?id=352248990&isSearchRequest=true&makeModelVariant1.makeId=13800&makeModelVariant1.modelDescription=SDP&minFirstRegistrationDate=2012-01-01&pageNumber=1&scopeId=ST&action=topOfPage&top=1:1&searchId=40ea1d83-e73a-b22b-1392-145fd49f527f&ref=srp";
            url = this.sourceFunctions.updateUrl(url);
            // console.log(url);
            let json = yield (0, network_utils_1.getJson)(url, this.sourceFunctions.headers, false, { source: sources_1.sources.MDE });
            // writeJsonIntoFile(json.data, 'data.json')
            let parsedItem = this.sourceFunctions.scrapeTrailerJson(json.data);
            // console.log(parsedItem);
            for (let item of parsedItem) {
                console.log("processedItem", item);
            }
        });
    }
    test_fetching_json_page() {
        return __awaiter(this, void 0, void 0, function* () {
            let url = "https://m.mobile.de/svc/s/?top&ps=0&tic&psz=20&vc=Car&ms=22900;10;;&dam=0&p=0%3A1000000&fr=2013:&sb=doc&od=down";
            while (url) {
                let json = yield (0, network_utils_1.getJson)(url, true);
                console.log(json.data);
                url = this.sourceFunctions.getNextPageUrlJson(json.data, url);
                console.log('json', json);
                console.log("next page", url);
            }
        });
    }
    test_total_ad_count() {
        return __awaiter(this, void 0, void 0, function* () {
            const jsonURL = "https://m.mobile.de/svc/s/?top&ps=0&tic&psz=20&vc=Car&ms=3500;10;;&dam=0&p=0%3A1000000&fr=2002:&sb=doc&od=down"; //JSON URL
            const htmlUrl = "https://suchen.mobile.de/fahrzeuge/search.html?fr=2014%3A&isSearchRequest=true&ms=25100%3B%3B%3BFH%3B&pw=350%3A409&ref=dsp&s=Truck&vc=SemiTrailerTruck&wf=WHEEL_DRIVE_6x2";
            // const htmlUrl = 'https://suchen.mobile.de/fahrzeuge/search.html?ax=2%3A2&c=StandardTractorAndTrailerUnit&dam=0&fr=2014%3A&isSearchRequest=true&ms=17200%3B%3B%3BActros%3B&od=down&p=10000%3A&pw=309%3A409&s=Truck&sb=doc&vc=SemiTrailerTruck'
            const { $ } = yield (0, network_utils_1.getHTML)(htmlUrl, this.sourceFunctions);
            const count = this.sourceFunctions.getAdsCount($);
            logger_1.default.info(count, "getAdsCount");
        });
    }
    test_processor_page_parsing() {
        return __awaiter(this, void 0, void 0, function* () {
            this.context.url = "https://m.mobile.de/svc/s/?top&ps=0&tic&psz=20&vc=Car&ms=17200;136;;&dam=0&p=0%3A1000000&fr=2012:&sb=doc&od=down";
            this.context.dbServer = enums_1.dbServers.cars;
            this.context.vehicleType = enums_1.vehicleTypes.car;
            this.context.linkId = "1093";
            let proxyConfig = { source: sources_1.sources.MDE, itemId: '4', retries: 1 };
            let { data } = yield (0, network_utils_1.getJson)(this.context.url, this.sourceFunctions.headers, false, proxyConfig);
            let idUrls = {};
            yield this.sourceFunctions.addItemsJson(data, idUrls, this.context.url);
            if (this.sourceFunctions.supportScrapeList(this.context.vehicleType)) {
                console.log(idUrls);
            }
            else {
                throw "Wrong result";
            }
        });
    }
}
exports.MDEtesting = MDEtesting;
//# sourceMappingURL=sample.js.map