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
exports.BNUTesting = void 0;
const enums_1 = require("../../config/enums");
const network_utils_1 = require("../../network-utils");
const process_1 = require("../../process");
const Testing_1 = require("../../tests/Testing");
const sources_1 = require("../sources");
const functions_1 = require("./functions");
class BNUTesting {
    constructor() {
        this.context = {
            url: '',
            source: sources_1.sources.BNU,
            vehicleType: enums_1.vehicleTypes.pharmacy,
            sourceId: null,
            dbServer: enums_1.dbServers.local,
            itemId: null
        };
        this.sourceFunctions = new functions_1.BNUFunctions();
        // all test should done here. The ultimate test zone
        this.testing();
    }
    testing() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.test_ad();
            // await this.test_page()
            // await this.test_E2e()
            // await this.testIsAdRemoved()
        });
    }
    test_E2e() {
        return __awaiter(this, void 0, void 0, function* () {
            this.context.url = 'https://www.benu.lv/e-aptieka/vichy-dercos-aminexil-ampulas-pret-matu-izkrisanu-viriesiem-6ml-n21';
            this.context.sourceId = '1336822';
            yield (0, Testing_1.performE2e)(this.context, this.sourceFunctions);
        });
    }
    test_ad() {
        return __awaiter(this, void 0, void 0, function* () {
            let urls = [
                // "https://www.benu.ee/tooted/vaata-koiki-soodustooteid/apivita-aqua-beelicious-silmaumbrusgeel-15ml",
                // "https://www.benu.ee/tooted/sars-cov2abrsv-fluorecare-antigeeni-kiirtest-ninast-n1",
                // "https://www.benu.ee/tooted/stenders-katekreem-greibi-245ml",
                // "https://www.benu.ee/tooted/salviagalen-f-hambapasta-75ml",
                // "https://www.benu.ee/tooted/orto-vedelseep-roheline-oun-5l",
                // "https://www.benu.ee/tooted/pro-expert-vitamiin-d-senior-olikapslid-4000iu-n60",
                // "https://www.benu.ee/tooted/aerochamber-plus-flow-vu-keskmise-maskiga-vahemahuti-lastele-1-5-a",
                // "https://www.benu.ee/tooted/livsane-glukoositropsid-vitamiin-c-ga-sidrun-n17",
                "https://www.benu.lv/e-aptieka/ducray-keracnyl-pp-atjaunojoss-krems-problematiskai-adai-30ml"
            ];
            let url = urls[0];
            let { $ } = yield (0, network_utils_1.getHTML)(url, this.sourceFunctions, { source: sources_1.sources.BNU });
            let isRemoved = this.sourceFunctions.isAdRemoved($);
            console.log({ isRemoved });
            let parsedItem = yield this.sourceFunctions.scrapePharmacyItem($, url);
            let processedItem = yield (0, process_1.processItem)(parsedItem, this.context.source, this.context.vehicleType);
            console.log("processedItem", processedItem);
        });
    }
    test_page() {
        return __awaiter(this, void 0, void 0, function* () {
            let prevPageOptions;
            let idUrls = {};
            let url = "https://www.benu.lv/core/defaultActions/ajax/helper.ajax.php";
            let nextPageOptions = this.sourceFunctions.getNextPageByOptions(prevPageOptions);
            let { data } = yield (0, network_utils_1.getResponseWithOptions)(url, nextPageOptions);
            console.log(data);
            let nextPageUrl = this.sourceFunctions.getNextPageUrl(data, url);
            this.sourceFunctions.addItems(data, idUrls);
            // return {nextPageUrl, nextPageOptions};
            // let { nextPageUrl, idUrls, nextPageOptions } = await fetchIds(url, this.sourceFunctions, this.source, this.vehicleType)
            console.log(nextPageUrl, idUrls, nextPageOptions);
        });
    }
    testIsAdRemoved() {
        return __awaiter(this, void 0, void 0, function* () {
            let url = 'https://www.benu.ee/tooted/sudafed-expectorant-siirup-620mgml-100ml';
            let { $ } = yield (0, network_utils_1.getHTML)(url, this.sourceFunctions, { source: this.context.source });
            let isRemoved = this.sourceFunctions.isAdRemoved($);
            console.log({ isRemoved });
        });
    }
}
exports.BNUTesting = BNUTesting;
//# sourceMappingURL=sample.js.map