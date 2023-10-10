import { dbServers, vehicleTypes } from '../../config/enums'
import { fetchIds } from '../../fetch'
import { getHTML } from '../../network-utils'
import { processItem } from '../../process'
import { htmlFromSource, performE2e } from '../../tests/Testing'
import { SNKFunctions } from './functions'
import { ContextType } from '../../libs/logger'
import { sources } from '../sources'

export class SNKTesting {
    sourceFunctions: SNKFunctions
    context: ContextType = {
        url: '',
        source: sources.SNK,
        vehicleType: vehicleTypes.homeAppliances,
        sourceId: null,
        dbServer: dbServers.local,
        itemId: null,
    }

    constructor(autoLunch = true) {
        this.sourceFunctions = new SNKFunctions()

        if (autoLunch) {
            this.testing()
        }
    }

    async testing() {
        try {
            // await this.test_addRemoved()
            await this.test_ad()
            // await this.test_getNextPageUrl()
            // await this.test_fetching_all_page()
            // await this.test_addItems()
            // await this.test_add()
            // await this.test_e2e()
            // await this.test_subLinks()
            // await this.test_ads_count()
        } catch (error) {
            console.log('Error ==>', error)
        }
    }

    async test_e2e() {
        this.context.url =
            'https://www.senukai.lt/p/dulkiu-siurblys-sluota-karcher-fc-3/b92u'
        this.context.sourceId = '903840918323'
        await performE2e(this.context, this.sourceFunctions)
    }

    async test_ad() {
        let url = 'https://www.senukai.lt/p/plyteles-akmens-mases-cerrad-climatic-5900423052912-1197-mm-x-597-mm/jxxo?cat=axs&index=1'
        let { $ } = await getHTML(url, this.sourceFunctions, { source: sources.SNK })

        let parsedItem = this.sourceFunctions.scrapeHomeAppliancesItem($, url)

        let processedItem = await processItem(parsedItem, this.context.source, this.context.vehicleType)
        console.log('processedItem', processedItem)
    }

    async test_addRemoved() {
        // testing gibberish url cause blocked by site
        let url =
            'https://www.senukai.lt/p/plyteles-akmens-mases-cerrad-climatic-59004230529121222-1197-mm-x-597-mm/jxxo?cat=axs&index=1'
        let { $ } = await getHTML(url, this.sourceFunctions)

        let isAddRemoved = this.sourceFunctions.isAdRemoved($)

        console.log('isAddRemoved ==>', isAddRemoved)
    }

    async test_subLinks() {
        let url =
            'https://www.senukai.lt/c/buitine-technika/smulki-virtuves-technika/5b3'
        let { $ } = await getHTML(url, this.sourceFunctions)

        let subLinkUrls = this.sourceFunctions.getSubLinks($, url)
        console.log('subLinkUrls', subLinkUrls)
    }
    async test_add() {
        const idUrls = {}
        const url =
            'https://www.senukai.lt/c/statyba-ir-remontas/elektros-instaliacija/elementai-ir-ju-krovikliai/elementu-krovikliai/aij?page=5'
        let { $ } = await getHTML(url, this.sourceFunctions)
        this.sourceFunctions.addItems($, idUrls, url)
        console.log('items', idUrls)
    }

    async test_getNextPageUrl() {
        let url =
            'https://www.senukai.lt/c/buitine-technika/imontuojama-technika/kaitlentes/7v8'
        let { $ } = await getHTML(url, this.sourceFunctions)

        let nextPageUrl = this.sourceFunctions.getNextPageUrl($, url)
        console.log('nextPageUrl', nextPageUrl)
    }
    async test_ads_count() {
        let url = 'https://www.senukai.lt/c/autoprekes/padangos/6qp'
        let { $ } = await getHTML(url, this.sourceFunctions)

        let { totalAds, totalPages } = this.sourceFunctions.getAdsCount($)
        console.log({ totalAds, totalPages })
    }

    async test_fetching_all_page() {
        this.context.url = 'https://www.senukai.lt/paieska/?c3=Kompiuterinė+technika%2C+biuro+prekės%2F%2FNešiojami+kompiuteriai+ir+priedai%2F%2FNešiojami+kompiuteriai&c4=Kompiuterinė+technika%2C+biuro+prekės%2F%2FNešiojami+kompiuteriai+ir+priedai%2F%2FNešiojami+kompiuteriai%2F%2FLenovo+nešiojami+kompiuteriai&q=lenovo'
        while (this.context.url) {
            let { nextPageUrl, idUrls } = await fetchIds(this.context, this.sourceFunctions, undefined, undefined)
            this.context.url = nextPageUrl
            console.log({ nextPageUrl, idUrls: Object.keys(idUrls).length })
        }
    }

    async test_addItems() {
        this.context.url = 'https://www.senukai.lt/paieska/?c3=Kompiuterinė+technika%2C+biuro+prekės%2F%2FNešiojami+kompiuteriai+ir+priedai%2F%2FNešiojami+kompiuteriai&c4=Kompiuterinė+technika%2C+biuro+prekės%2F%2FNešiojami+kompiuteriai+ir+priedai%2F%2FNešiojami+kompiuteriai%2F%2FLenovo+nešiojami+kompiuteriai&q=lenovo'
        this.context.url = 'https://www.senukai.lt/paieska/?c3=Kompiuterinė+technika%2C+biuro+prekės%2F%2FNešiojami+kompiuteriai+ir+priedai%2F%2FNešiojami+kompiuteriai&c4=Kompiuterinė+technika%2C+biuro+prekės%2F%2FNešiojami+kompiuteriai+ir+priedai%2F%2FNešiojami+kompiuteriai%2F%2FLenovo+nešiojami+kompiuteriai&q=lenovo&o=432'
        let { nextPageUrl, idUrls } = await fetchIds(this.context, this.sourceFunctions, undefined, undefined)
        console.log({ nextPageUrl, idUrls })
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

    // Home Appliances Testing

    async test_homeAppliances_1() {
        return await this.loadHtml({
            filename: 'senukai_homeAppliences_1',
            url: 'https://www.senukai.lt/p/imontuojama-indaplove-bosch-smv6zcx42e/fujs?cat=5w9&index=1',
            vehicleType: vehicleTypes.homeAppliances,
        })
    }

    async test_homeAppliances_2() {
        return await this.loadHtml({
            filename: 'senukai_homeAppliences_2',
            url: 'https://www.senukai.lt/p/skalbimo-masina-aeg-l8fnc68s-8-kg-balta/j7p5?cat=7yg&index=2',
            vehicleType: vehicleTypes.homeAppliances,
        })
    }

    async test_homeAppliances_3() {
        return await this.loadHtml({
            filename: 'senukai_homeAppliences_3',
            url: 'https://www.senukai.lt/p/dulkiu-siurblys-robotas-roborock-s7/i4g2?cat=5a7&index=2',
            vehicleType: vehicleTypes.homeAppliances,
        })
    }

    async test_homeAppliances_4() {
        return await this.loadHtml({
            filename: 'senukai_homeAppliences_4',
            url: 'https://www.senukai.lt/p/elektrine-kaitlente-aeg-hk654070xb/2xwf',
            vehicleType: vehicleTypes.homeAppliances,
        })
    }
}
