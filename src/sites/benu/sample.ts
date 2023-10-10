import { dbServers, vehicleTypes } from "../../config/enums";
import { ContextType } from "../../libs/logger";
import { getHTML, getResponseWithOptions } from "../../network-utils";
// import { processItem } from '../../process'
// import { performE2e } from '../../tests/Testing'
import { sources } from "../sources";
import { BNUFunctions } from "./functions";

export class BNUTesting {
    sourceFunctions: BNUFunctions;
    context: ContextType = {
        url: "",
        source: sources.BNU,
        vehicleType: vehicleTypes.pharmacy,
        sourceId: null,
        dbServer: dbServers.local,
        itemId: null,
    };

    constructor() {
        this.sourceFunctions = new BNUFunctions();

        // all test should done here. The ultimate test zone
        this.testing();
    }

    async testing() {
        await this.test_ad();
        // await this.test_page()
        // await this.test_E2e()
        // await this.testIsAdRemoved()
    }

    async test_E2e() {
        this.context.url =
            "https://www.benu.lv/e-aptieka/vichy-dercos-aminexil-ampulas-pret-matu-izkrisanu-viriesiem-6ml-n21";
        this.context.sourceId = "1336822";
        // await performE2e(this.context, this.sourceFunctions);
    }

    async test_ad() {
        let urls = [
            // "https://www.benu.ee/tooted/vaata-koiki-soodustooteid/apivita-aqua-beelicious-silmaumbrusgeel-15ml",
            // "https://www.benu.ee/tooted/sars-cov2abrsv-fluorecare-antigeeni-kiirtest-ninast-n1",
            // "https://www.benu.ee/tooted/stenders-katekreem-greibi-245ml",
            // "https://www.benu.ee/tooted/salviagalen-f-hambapasta-75ml",
            // "https://www.benu.ee/tooted/orto-vedelseep-roheline-oun-5l",
            // "https://www.benu.ee/tooted/pro-expert-vitamiin-d-senior-olikapslid-4000iu-n60",
            // "https://www.benu.ee/tooted/aerochamber-plus-flow-vu-keskmise-maskiga-vahemahuti-lastele-1-5-a",
            // "https://www.benu.ee/tooted/livsane-glukoositropsid-vitamiin-c-ga-sidrun-n17",
            "https://www.benu.lv/e-aptieka/ducray-keracnyl-pp-atjaunojoss-krems-problematiskai-adai-30ml",
        ];
        let url = urls[0];
        let { $ } = await getHTML(url, this.sourceFunctions, { source: sources.BNU });

        let isRemoved = this.sourceFunctions.isAdRemoved($);
        console.log({ isRemoved });

        let parsedItem = await this.sourceFunctions.scrapePharmacyItem($, url);
        // let processedItem = await processItem(parsedItem, this.context.source, this.context.vehicleType);
        // console.log("processedItem", processedItem);
    }

    async test_page() {
        let prevPageOptions;
        let idUrls: any = {};
        let url = "https://www.benu.lv/core/defaultActions/ajax/helper.ajax.php";
        let nextPageOptions = this.sourceFunctions.getNextPageByOptions(prevPageOptions);

        let { data } = await getResponseWithOptions(url, nextPageOptions);
        console.log(data);

        let nextPageUrl = this.sourceFunctions.getNextPageUrl(data, url);
        this.sourceFunctions.addItems(data, idUrls);

        // return {nextPageUrl, nextPageOptions};
        // let { nextPageUrl, idUrls, nextPageOptions } = await fetchIds(url, this.sourceFunctions, this.source, this.vehicleType)
        console.log(nextPageUrl, idUrls, nextPageOptions);
    }

    async testIsAdRemoved() {
        let url = "https://www.benu.ee/tooted/sudafed-expectorant-siirup-620mgml-100ml";
        let { $ } = await getHTML(url, this.sourceFunctions, { source: this.context.source });
        let isRemoved = this.sourceFunctions.isAdRemoved($);
        console.log({ isRemoved });
    }
}
