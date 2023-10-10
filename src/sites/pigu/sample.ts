import { dbServers, vehicleTypes } from '../../config/enums'
import { fetchIds } from '../../fetch'
import { ContextType } from '../../libs/logger'
import { getHTML } from '../../network-utils'
import { processItem } from '../../process'
import { htmlFromSource, performE2e } from '../../tests/Testing'
import { sources } from '../sources'
import { PGUFunctions } from './functions'

export class PGUTesting {
    sourceFunctions: PGUFunctions
    context: ContextType = {
        url: '',
        source: sources.PGU,
        vehicleType: vehicleTypes.homeAppliances,
        sourceId: null,
        dbServer: dbServers.local,
        itemId: null,
    }

    constructor(autoLunch = true) {
        this.sourceFunctions = new PGUFunctions()

        if (autoLunch) {
            this.testing()
        }
    }

    async testing() {
        try {
            await this.test_ad()
            // await this.test_ad_removed()
            // await this.test_getNextPageUrl()
            // await this.test_fetching_all_page()
            // await this.test_addItems()

            // await this.test_E2e()
            // await this.test_subLinks()
            // await closeCluster()
        } catch (error) {
            console.log('error ==>', error)
        }
    }

    async test_e2e() {
        this.context.url =
            'https://pigu.lt/lt/baldai-ir-namu-interjeras/kilimai-kilimeliai/kilimai/kilimas-yazz-6076-133x190-cm?id=55657259'
        this.context.sourceId = '39712'
        await performE2e(this.context, this.sourceFunctions)
    }

    async test_ad() {
        this.context.url =
            'https://pigu.lt/lt/buitine-technika-elektronika/kaitlentes/gorenje-it640wsc?id=25398590'

        let { $ } = await getHTML(this.context.url, this.sourceFunctions)
        let isAdRemoved = this.sourceFunctions.isAdRemoved($)
        console.log('isAdRemoved =>', isAdRemoved)
        let parsedItem = this.sourceFunctions.scrapeHomeAppliancesItem(
            $,
            this.context.url
        )

        let processedItem = await processItem(
            parsedItem,
            this.context.source,
            this.context.vehicleType
        )
        console.log('processedItem =>', processedItem)
    }

    async test_ad_removed() {
        // nonexistent product url
        this.context.url =
            'https://pigu.lt/lt/buitine-technika-ir-elektronika/saldymo-iranga/saldikliai-saldymo-dezes/liebherr-gn-1066?id=11183026'

        let { $ } = await getHTML(this.context.url, this.sourceFunctions)

        // as of 18Apr, on removed add, page redirected to cateogry
        // approach check current page url not same as url
        // headless false so alternate

        let isAdRemoved = this.sourceFunctions.isAdRemoved($)
        console.log('isAdRemoved =>', isAdRemoved)
    }

    async test_getNextPageUrl() {
        let url =
            'https://pigu.lt/lt/buitine-technika-elektronika/gartraukiai-garu-rinktuvai'
        let { $ } = await getHTML(url, this.sourceFunctions)

        let nextPageUrl = this.sourceFunctions.getNextPageUrl($, url)
        console.log('nextPageUrl', nextPageUrl)
    }
    async test_subLinks() {
        let url = 'https://pigu.lt/lt/vaikams-ir-kudikiams/lauko-zaislai'
        let { $ } = await getHTML(url, this.sourceFunctions)

        let subLinkUrls = this.sourceFunctions.getSubLinks($, url)
        console.log('subLinkUrls', subLinkUrls)
    }
    async test_fetching_all_page() {
        let url =
            'https://pigu.lt/lt/buitine-technika-elektronika/gartraukiai-garu-rinktuvai'
        while (url) {
            let { $ } = await getHTML(url, this.sourceFunctions)

            url = this.sourceFunctions.getNextPageUrl($, url)
            console.log('next page ' + url)
        }
    }

    async test_addItems() {
        this.context.url =
            'https://pigu.lt/lt/baldai-ir-namu-interjeras/namu-interjeras/zvakides-zvakes?f[1934280056][1786367244]=ambientair'
        let { nextPageUrl, idUrls } = await fetchIds(
            this.context,
            this.sourceFunctions,
            undefined,
            undefined
        )
        console.log(nextPageUrl, idUrls)
    }

    // FOR Unit Testing

    async loadHtml({
        filename,
        url,
        vehicleType,
    }: {
        filename: string
        url: string
        vehicleType: string
    }) {
        let parsedItem = undefined

        const $ = await htmlFromSource({
            url,
            source: this.context.source,
            filename: filename,
            integration: this.sourceFunctions,
        })

        if (vehicleType == vehicleTypes.homeAppliances) {
            parsedItem = this.sourceFunctions.scrapeHomeAppliancesItem($, url)
        }

        const processedItem = await processItem(
            parsedItem,
            this.context.source,
            vehicleType
        )

        return processedItem
    }

    async test_pguAdWithDashKg() {
        return await this.loadHtml({
            filename: 'pgu_kg',
            url: 'https://pigu.lt/lt/buitine-technika-elektronika/indaploves/indaplove-mpm-mpm-45-zmi-02?id=42584263',
            vehicleType: vehicleTypes.homeAppliances,
        })
    }

    async test_pguAd1() {
        return await this.loadHtml({
            filename: 'pgu_ad1',
            url: 'https://pigu.lt/lt/buitine-technika-elektronika/indaploves/indaplove-gorenje-gs541d10x?id=42928108',
            vehicleType: vehicleTypes.homeAppliances,
        })
    }
}
