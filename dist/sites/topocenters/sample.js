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
exports.TOPTesting = void 0;
const enums_1 = require("../../config/enums");
const network_utils_1 = require("../../network-utils");
const process_1 = require("../../process");
const Testing_1 = require("../../tests/Testing");
const sources_1 = require("../sources");
const functions_1 = require("./functions");
class TOPTesting {
    constructor(autoLunch = true) {
        this.context = {
            url: '',
            source: sources_1.sources.TOP,
            vehicleType: enums_1.vehicleTypes.homeAppliances,
            sourceId: null,
            dbServer: enums_1.dbServers.local,
            itemId: null,
        };
        this.sourceFunctions = new functions_1.TOPFunctions();
        if (autoLunch) {
            this.testing();
        }
    }
    testing() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // await this.test_fetching_json_page()
                // await this.test_json_page()
                yield this.test_jsonAd();
                // await this.test_e2e()
                // await this.test_isAddRemoved()
            }
            catch (e) {
                console.log('e ==>', e);
            }
        });
    }
    test_e2e() {
        return __awaiter(this, void 0, void 0, function* () {
            this.context.url =
                'https://www.topocentras.lt/graphql?query=ROOT_GetProduct&vars={"id":"14656"}';
            this.context.sourceId = '14656';
            yield (0, Testing_1.performE2e)(this.context, this.sourceFunctions);
        });
    }
    test_fetching_json_page() {
        return __awaiter(this, void 0, void 0, function* () {
            let url = `https://www.topocentras.lt/graphql?formVars={"sort":"discount","filters":{}}&query=getCatalog&vars={"categoryId":1738,"pageSize":20,"currentPage":1}`;
            while (url) {
                let json = yield (0, network_utils_1.getJson)(url, {}, true);
                console.log(json.data);
                url = this.sourceFunctions.getNextPageUrlJson(json.data, url);
                console.log('json', json);
                console.log('next page', url);
            }
        });
    }
    test_jsonAd() {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `https://www.topocentras.lt/graphql?query=ROOT_GetProduct&vars={\"id\":\"79871\"}`;
            // const url = `https://www.topocentras.lt/ketaus-keptuve-maku-blini-pan-cast-iron.html`
            const json = yield (0, network_utils_1.getJson)(url, {});
            const parsedItem = yield this.sourceFunctions.scrapeHomeAppliancesJson(json.data, url);
            const proccessItem = yield (0, process_1.processItem)(parsedItem, this.context.source, this.context.vehicleType);
            console.log(proccessItem);
        });
    }
    test_isAddRemoved() {
        return __awaiter(this, void 0, void 0, function* () {
            // random ID
            const url = `https://www.topocentras.lt/graphql?query=ROOT_GetProduct&vars={\"id\":\"296291555\"}`;
            const json = yield (0, network_utils_1.getJson)(url, {});
            const isAddRemoved = yield this.sourceFunctions.isAdRemovedJson(json.data);
            console.log('isAdRemovedJson =>', isAddRemoved);
        });
    }
    test_json_page() {
        return __awaiter(this, void 0, void 0, function* () {
            let idUrls = [];
            const url = `https://www.topocentras.lt/graphql?formVars={"sort":"discount","filters":{}}&query=getCatalog&vars={"categoryId":1738,"pageSize":20,"currentPage":1}`;
            const json = yield (0, network_utils_1.getJson)(url);
            this.sourceFunctions.addItemsJson(json.data, idUrls, url);
            idUrls.forEach((url) => __awaiter(this, void 0, void 0, function* () {
                const jsonItem = yield (0, network_utils_1.getJson)(url);
                const data = yield this.sourceFunctions.scrapeHomeAppliancesJson(jsonItem.data, url);
                console.log(data);
            }));
        });
    }
}
exports.TOPTesting = TOPTesting;
//# sourceMappingURL=sample.js.map