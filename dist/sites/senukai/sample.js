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
exports.SNKTesting = void 0;
const enums_1 = require("../../config/enums");
const fetch_1 = require("../../fetch");
const network_utils_1 = require("../../network-utils");
const process_1 = require("../../process");
const Testing_1 = require("../../tests/Testing");
const functions_1 = require("./functions");
const sources_1 = require("../sources");
class SNKTesting {
    constructor(autoLunch = true) {
        this.context = {
            url: '',
            source: sources_1.sources.SNK,
            vehicleType: enums_1.vehicleTypes.homeAppliances,
            sourceId: null,
            dbServer: enums_1.dbServers.local,
            itemId: null,
        };
        this.sourceFunctions = new functions_1.SNKFunctions();
        if (autoLunch) {
            this.testing();
        }
    }
    testing() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // await this.test_addRemoved()
                yield this.test_ad();
                // await this.test_getNextPageUrl()
                // await this.test_fetching_all_page()
                // await this.test_addItems()
                // await this.test_add()
                // await this.test_e2e()
                // await this.test_subLinks()
                // await this.test_ads_count()
            }
            catch (error) {
                console.log('Error ==>', error);
            }
        });
    }
    test_e2e() {
        return __awaiter(this, void 0, void 0, function* () {
            this.context.url =
                'https://www.senukai.lt/p/dulkiu-siurblys-sluota-karcher-fc-3/b92u';
            this.context.sourceId = '903840918323';
            yield (0, Testing_1.performE2e)(this.context, this.sourceFunctions);
        });
    }
    test_ad() {
        return __awaiter(this, void 0, void 0, function* () {
            let url = 'https://www.senukai.lt/p/plyteles-akmens-mases-cerrad-climatic-5900423052912-1197-mm-x-597-mm/jxxo?cat=axs&index=1';
            let { $ } = yield (0, network_utils_1.getHTML)(url, this.sourceFunctions, { source: sources_1.sources.SNK });
            let parsedItem = this.sourceFunctions.scrapeHomeAppliancesItem($, url);
            let processedItem = yield (0, process_1.processItem)(parsedItem, this.context.source, this.context.vehicleType);
            console.log('processedItem', processedItem);
        });
    }
    test_addRemoved() {
        return __awaiter(this, void 0, void 0, function* () {
            // testing gibberish url cause blocked by site
            let url = 'https://www.senukai.lt/p/plyteles-akmens-mases-cerrad-climatic-59004230529121222-1197-mm-x-597-mm/jxxo?cat=axs&index=1';
            let { $ } = yield (0, network_utils_1.getHTML)(url, this.sourceFunctions);
            let isAddRemoved = this.sourceFunctions.isAdRemoved($);
            console.log('isAddRemoved ==>', isAddRemoved);
        });
    }
    test_subLinks() {
        return __awaiter(this, void 0, void 0, function* () {
            let url = 'https://www.senukai.lt/c/buitine-technika/smulki-virtuves-technika/5b3';
            let { $ } = yield (0, network_utils_1.getHTML)(url, this.sourceFunctions);
            let subLinkUrls = this.sourceFunctions.getSubLinks($, url);
            console.log('subLinkUrls', subLinkUrls);
        });
    }
    test_add() {
        return __awaiter(this, void 0, void 0, function* () {
            const idUrls = {};
            const url = 'https://www.senukai.lt/c/statyba-ir-remontas/elektros-instaliacija/elementai-ir-ju-krovikliai/elementu-krovikliai/aij?page=5';
            let { $ } = yield (0, network_utils_1.getHTML)(url, this.sourceFunctions);
            this.sourceFunctions.addItems($, idUrls, url);
            console.log('items', idUrls);
        });
    }
    test_getNextPageUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            let url = 'https://www.senukai.lt/c/buitine-technika/imontuojama-technika/kaitlentes/7v8';
            let { $ } = yield (0, network_utils_1.getHTML)(url, this.sourceFunctions);
            let nextPageUrl = this.sourceFunctions.getNextPageUrl($, url);
            console.log('nextPageUrl', nextPageUrl);
        });
    }
    test_ads_count() {
        return __awaiter(this, void 0, void 0, function* () {
            let url = 'https://www.senukai.lt/c/autoprekes/padangos/6qp';
            let { $ } = yield (0, network_utils_1.getHTML)(url, this.sourceFunctions);
            let { totalAds, totalPages } = this.sourceFunctions.getAdsCount($);
            console.log({ totalAds, totalPages });
        });
    }
    test_fetching_all_page() {
        return __awaiter(this, void 0, void 0, function* () {
            this.context.url = 'https://www.senukai.lt/paieska/?c3=Kompiuterinė+technika%2C+biuro+prekės%2F%2FNešiojami+kompiuteriai+ir+priedai%2F%2FNešiojami+kompiuteriai&c4=Kompiuterinė+technika%2C+biuro+prekės%2F%2FNešiojami+kompiuteriai+ir+priedai%2F%2FNešiojami+kompiuteriai%2F%2FLenovo+nešiojami+kompiuteriai&q=lenovo';
            while (this.context.url) {
                let { nextPageUrl, idUrls } = yield (0, fetch_1.fetchIds)(this.context, this.sourceFunctions, undefined, undefined);
                this.context.url = nextPageUrl;
                console.log({ nextPageUrl, idUrls: Object.keys(idUrls).length });
            }
        });
    }
    test_addItems() {
        return __awaiter(this, void 0, void 0, function* () {
            this.context.url = 'https://www.senukai.lt/paieska/?c3=Kompiuterinė+technika%2C+biuro+prekės%2F%2FNešiojami+kompiuteriai+ir+priedai%2F%2FNešiojami+kompiuteriai&c4=Kompiuterinė+technika%2C+biuro+prekės%2F%2FNešiojami+kompiuteriai+ir+priedai%2F%2FNešiojami+kompiuteriai%2F%2FLenovo+nešiojami+kompiuteriai&q=lenovo';
            this.context.url = 'https://www.senukai.lt/paieska/?c3=Kompiuterinė+technika%2C+biuro+prekės%2F%2FNešiojami+kompiuteriai+ir+priedai%2F%2FNešiojami+kompiuteriai&c4=Kompiuterinė+technika%2C+biuro+prekės%2F%2FNešiojami+kompiuteriai+ir+priedai%2F%2FNešiojami+kompiuteriai%2F%2FLenovo+nešiojami+kompiuteriai&q=lenovo&o=432';
            let { nextPageUrl, idUrls } = yield (0, fetch_1.fetchIds)(this.context, this.sourceFunctions, undefined, undefined);
            console.log({ nextPageUrl, idUrls });
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
    // Home Appliances Testing
    test_homeAppliances_1() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.loadHtml({
                filename: 'senukai_homeAppliences_1',
                url: 'https://www.senukai.lt/p/imontuojama-indaplove-bosch-smv6zcx42e/fujs?cat=5w9&index=1',
                vehicleType: enums_1.vehicleTypes.homeAppliances,
            });
        });
    }
    test_homeAppliances_2() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.loadHtml({
                filename: 'senukai_homeAppliences_2',
                url: 'https://www.senukai.lt/p/skalbimo-masina-aeg-l8fnc68s-8-kg-balta/j7p5?cat=7yg&index=2',
                vehicleType: enums_1.vehicleTypes.homeAppliances,
            });
        });
    }
    test_homeAppliances_3() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.loadHtml({
                filename: 'senukai_homeAppliences_3',
                url: 'https://www.senukai.lt/p/dulkiu-siurblys-robotas-roborock-s7/i4g2?cat=5a7&index=2',
                vehicleType: enums_1.vehicleTypes.homeAppliances,
            });
        });
    }
    test_homeAppliances_4() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.loadHtml({
                filename: 'senukai_homeAppliences_4',
                url: 'https://www.senukai.lt/p/elektrine-kaitlente-aeg-hk654070xb/2xwf',
                vehicleType: enums_1.vehicleTypes.homeAppliances,
            });
        });
    }
}
exports.SNKTesting = SNKTesting;
//# sourceMappingURL=sample.js.map