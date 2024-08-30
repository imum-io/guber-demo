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
exports.SLDTesting = void 0;
const enums_1 = require("../../config/enums");
const network_utils_1 = require("../../network-utils");
const sources_1 = require("../sources");
const functions_1 = require("./functions");
class SLDTesting {
    constructor() {
        this.context = {
            url: '',
            source: sources_1.sources.SLD,
            vehicleType: enums_1.vehicleTypes.aggregator,
            sourceId: '',
            dbServer: enums_1.dbServers.local,
            itemId: ''
        };
        this.sourceFunctions = new functions_1.SLDFuntions();
        // all test should done here. The ultimate test zone
        this.testing();
    }
    testing() {
        return __awaiter(this, void 0, void 0, function* () {
            let sourceId = '4539';
            let url = `https://www.salidzini.lv/cena?q=BSK999330T`;
            yield this.test_page();
            // await this.test_ad(url)
            // await this.test_is_changed()
            // await this.test_e2e()
            // await this.test_fetching_all_page()
        });
    }
    test_page() {
        return __awaiter(this, void 0, void 0, function* () {
            this.context.url = "https://www.salidzini.lv/cena?q=BSK999330T";
            let idUrls = {};
            let nextPageUrl;
            let { $ } = yield (0, network_utils_1.getHTML)(this.context.url, this.sourceFunctions);
            this.sourceFunctions.addItems($, idUrls, this.context.url);
            nextPageUrl = this.sourceFunctions.getNextPageUrl($, this.context.url);
            console.log(nextPageUrl, idUrls);
        });
    }
    test_ad(url) {
        return __awaiter(this, void 0, void 0, function* () {
            let { $ } = yield (0, network_utils_1.getHTML)(url, this.sourceFunctions);
            let parsedItem = yield this.sourceFunctions.scrapeAggregatorItem($, url, { model: 'BSK999330T', barcode: '7332543808533' });
            console.log(parsedItem);
            return parsedItem;
        });
    }
}
exports.SLDTesting = SLDTesting;
//# sourceMappingURL=sample.js.map