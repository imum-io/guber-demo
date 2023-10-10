import { dbServers, vehicleTypes } from "../../config/enums";
import { ContextType } from "../../libs/logger";
import { getJson } from "../../network-utils";
// import { processItem } from '../../process'
// import { performE2e } from '../../tests/Testing'
import { sources } from "../sources";
import { TOPFunctions } from "./functions";

export class TOPTesting {
    sourceFunctions: TOPFunctions;
    context: ContextType = {
        url: "",
        source: sources.TOP,
        vehicleType: vehicleTypes.homeAppliances,
        sourceId: null,
        dbServer: dbServers.local,
        itemId: null,
    };

    constructor(autoLunch = true) {
        this.sourceFunctions = new TOPFunctions();

        if (autoLunch) {
            this.testing();
        }
    }

    async testing() {
        try {
            // await this.test_fetching_json_page()
            // await this.test_json_page()
            await this.test_jsonAd();
            // await this.test_e2e()
            // await this.test_isAddRemoved()
        } catch (e) {
            console.log("e ==>", e);
        }
    }

    async test_e2e() {
        this.context.url = 'https://www.topocentras.lt/graphql?query=ROOT_GetProduct&vars={"id":"14656"}';
        this.context.sourceId = "14656";
        // await performE2e(this.context, this.sourceFunctions as any);
    }

    async test_fetching_json_page() {
        let url = `https://www.topocentras.lt/graphql?formVars={"sort":"discount","filters":{}}&query=getCatalog&vars={"categoryId":1738,"pageSize":20,"currentPage":1}`;
        while (url) {
            let json = await getJson(url, {}, true);
            console.log(json.data);

            url = this.sourceFunctions.getNextPageUrlJson(json.data, url);
            console.log("json", json);
            console.log("next page", url);
        }
    }

    async test_jsonAd() {
        const url = `https://www.topocentras.lt/graphql?query=ROOT_GetProduct&vars={\"id\":\"79871\"}`;
        // const url = `https://www.topocentras.lt/ketaus-keptuve-maku-blini-pan-cast-iron.html`
        const json = await getJson(url, {});
        const parsedItem = await this.sourceFunctions.scrapeHomeAppliancesJson(json.data, url);
        // const proccessItem = await processItem(parsedItem, this.context.source, this.context.vehicleType);
        // console.log(proccessItem);
    }

    async test_isAddRemoved() {
        // random ID
        const url = `https://www.topocentras.lt/graphql?query=ROOT_GetProduct&vars={\"id\":\"296291555\"}`;

        const json = await getJson(url, {});

        const isAddRemoved = await this.sourceFunctions.isAdRemovedJson(json.data);

        console.log("isAdRemovedJson =>", isAddRemoved);
    }

    async test_json_page() {
        let idUrls: any[] = [];
        const url = `https://www.topocentras.lt/graphql?formVars={"sort":"discount","filters":{}}&query=getCatalog&vars={"categoryId":1738,"pageSize":20,"currentPage":1}`;
        const json = await getJson(url);
        this.sourceFunctions.addItemsJson(json.data, idUrls, url);
        idUrls.forEach(async (url) => {
            const jsonItem = await getJson(url);
            const data = await this.sourceFunctions.scrapeHomeAppliancesJson(jsonItem.data, url);
            console.log(data);
        });
    }
}
