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
exports.PGUTesting = void 0;
const enums_1 = require("../../config/enums");
const fetch_1 = require("../../fetch");
const network_utils_1 = require("../../network-utils");
const process_1 = require("../../process");
const Testing_1 = require("../../tests/Testing");
const sources_1 = require("../sources");
const functions_1 = require("./functions");
class PGUTesting {
    constructor(autoLunch = true) {
        this.context = {
            url: '',
            source: sources_1.sources.PGU,
            vehicleType: enums_1.vehicleTypes.homeAppliances,
            sourceId: null,
            dbServer: enums_1.dbServers.local,
            itemId: null,
        };
        this.sourceFunctions = new functions_1.PGUFunctions();
        if (autoLunch) {
            this.testing();
        }
    }
    testing() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.test_ad();
                // await this.test_ad_removed()
                // await this.test_getNextPageUrl()
                // await this.test_fetching_all_page()
                // await this.test_addItems()
                // await this.test_E2e()
                // await this.test_subLinks()
                // await closeCluster()
            }
            catch (error) {
                console.log('error ==>', error);
            }
        });
    }
    test_e2e() {
        return __awaiter(this, void 0, void 0, function* () {
            this.context.url =
                'https://pigu.lt/lt/baldai-ir-namu-interjeras/kilimai-kilimeliai/kilimai/kilimas-yazz-6076-133x190-cm?id=55657259';
            this.context.sourceId = '39712';
            yield (0, Testing_1.performE2e)(this.context, this.sourceFunctions);
        });
    }
    test_ad() {
        return __awaiter(this, void 0, void 0, function* () {
            this.context.url =
                'https://pigu.lt/lt/buitine-technika-elektronika/kaitlentes/gorenje-it640wsc?id=25398590';
            let { $ } = yield (0, network_utils_1.getHTML)(this.context.url, this.sourceFunctions);
            let isAdRemoved = this.sourceFunctions.isAdRemoved($);
            console.log('isAdRemoved =>', isAdRemoved);
            let parsedItem = this.sourceFunctions.scrapeHomeAppliancesItem($, this.context.url);
            let processedItem = yield (0, process_1.processItem)(parsedItem, this.context.source, this.context.vehicleType);
            console.log('processedItem =>', processedItem);
        });
    }
    test_ad_removed() {
        return __awaiter(this, void 0, void 0, function* () {
            // nonexistent product url
            this.context.url =
                'https://pigu.lt/lt/buitine-technika-ir-elektronika/saldymo-iranga/saldikliai-saldymo-dezes/liebherr-gn-1066?id=11183026';
            let { $ } = yield (0, network_utils_1.getHTML)(this.context.url, this.sourceFunctions);
            // as of 18Apr, on removed add, page redirected to cateogry
            // approach check current page url not same as url
            // headless false so alternate
            let isAdRemoved = this.sourceFunctions.isAdRemoved($);
            console.log('isAdRemoved =>', isAdRemoved);
        });
    }
    test_getNextPageUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            let url = 'https://pigu.lt/lt/buitine-technika-elektronika/gartraukiai-garu-rinktuvai';
            let { $ } = yield (0, network_utils_1.getHTML)(url, this.sourceFunctions);
            let nextPageUrl = this.sourceFunctions.getNextPageUrl($, url);
            console.log('nextPageUrl', nextPageUrl);
        });
    }
    test_subLinks() {
        return __awaiter(this, void 0, void 0, function* () {
            let url = 'https://pigu.lt/lt/vaikams-ir-kudikiams/lauko-zaislai';
            let { $ } = yield (0, network_utils_1.getHTML)(url, this.sourceFunctions);
            let subLinkUrls = this.sourceFunctions.getSubLinks($, url);
            console.log('subLinkUrls', subLinkUrls);
        });
    }
    test_fetching_all_page() {
        return __awaiter(this, void 0, void 0, function* () {
            let url = 'https://pigu.lt/lt/buitine-technika-elektronika/gartraukiai-garu-rinktuvai';
            while (url) {
                let { $ } = yield (0, network_utils_1.getHTML)(url, this.sourceFunctions);
                url = this.sourceFunctions.getNextPageUrl($, url);
                console.log('next page ' + url);
            }
        });
    }
    test_addItems() {
        return __awaiter(this, void 0, void 0, function* () {
            this.context.url =
                'https://pigu.lt/lt/baldai-ir-namu-interjeras/namu-interjeras/zvakides-zvakes?f[1934280056][1786367244]=ambientair';
            let { nextPageUrl, idUrls } = yield (0, fetch_1.fetchIds)(this.context, this.sourceFunctions, undefined, undefined);
            console.log(nextPageUrl, idUrls);
        });
    }
    // FOR Unit Testing
    loadHtml({ filename, url, vehicleType, }) {
        return __awaiter(this, void 0, void 0, function* () {
            let parsedItem = undefined;
            const $ = yield (0, Testing_1.htmlFromSource)({
                url,
                source: this.context.source,
                filename: filename,
                integration: this.sourceFunctions,
            });
            if (vehicleType == enums_1.vehicleTypes.homeAppliances) {
                parsedItem = this.sourceFunctions.scrapeHomeAppliancesItem($, url);
            }
            const processedItem = yield (0, process_1.processItem)(parsedItem, this.context.source, vehicleType);
            return processedItem;
        });
    }
    test_pguAdWithDashKg() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.loadHtml({
                filename: 'pgu_kg',
                url: 'https://pigu.lt/lt/buitine-technika-elektronika/indaploves/indaplove-mpm-mpm-45-zmi-02?id=42584263',
                vehicleType: enums_1.vehicleTypes.homeAppliances,
            });
        });
    }
    test_pguAd1() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.loadHtml({
                filename: 'pgu_ad1',
                url: 'https://pigu.lt/lt/buitine-technika-elektronika/indaploves/indaplove-gorenje-gs541d10x?id=42928108',
                vehicleType: enums_1.vehicleTypes.homeAppliances,
            });
        });
    }
}
exports.PGUTesting = PGUTesting;
//# sourceMappingURL=sample.js.map