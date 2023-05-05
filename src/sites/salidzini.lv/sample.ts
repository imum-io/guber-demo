import { dbServers, vehicleTypes } from '../../config/enums'
import { ContextType } from '../../libs/logger'
import { getHTML } from '../../network-utils'
import { AggregatorInterface } from '../interfaces'
import { sources } from '../sources'
import { SLDFuntions } from './functions'

export class SLDTesting {
    sourceFunctions: AggregatorInterface;
    context: ContextType = {
        url: '',
        source: sources.SLD,
        vehicleType: vehicleTypes.aggregator,
        sourceId: '',
        dbServer: dbServers.local,
        itemId: ''
    }

    constructor() {
        this.sourceFunctions = new SLDFuntions()

        // all test should done here. The ultimate test zone
        this.testing()
    }

    async testing() {
        let sourceId = '4539'
        let url = `https://www.salidzini.lv/cena?q=BSK999330T`

        // await this.test_page()
        // await this.test_ad(url)
        // await this.test_is_changed()
        // await this.test_e2e()
        // await this.test_fetching_all_page()
        await this.test_page_ad_parsing()
    }

    async test_page() {
        this.context.url = "https://www.salidzini.lv/cena?q=BSK999330T"
        let idUrls: any = {}
        let nextPageUrl
        let { $ } = await getHTML(this.context.url, this.sourceFunctions)

        this.sourceFunctions.addItems($, idUrls, this.context.url)
        nextPageUrl = this.sourceFunctions.getNextPageUrl($, this.context.url)
        console.log(nextPageUrl, idUrls)
    }
    async test_ad(url) {
        let { $ } = await getHTML(url, this.sourceFunctions)
        let parsedItem = this.sourceFunctions.scrapeAggregatorItem($, url, { model: 'BSK999330T', barcode: '7332543808533' })
        console.log(parsedItem)
        return parsedItem
    }
    async test_page_ad_parsing() {
        this.context.url = "https://www.salidzini.lv/cena?q=iphone+13"
        let idUrls: any = {}
        let nextPageUrl: string
        let adLinkMeta = { brand: 'iphone', model: 'iphone 13' }

        let { $ } = await getHTML(this.context.url, this.sourceFunctions)

        this.sourceFunctions.addItems($, idUrls, this.context.url, adLinkMeta)
        nextPageUrl = this.sourceFunctions.getNextPageUrl($, this.context.url)

        console.log('idUrls', idUrls)
        if (nextPageUrl) {
            console.log('nextPageUrl', nextPageUrl)
        } else {
            console.log('Next page does not exists')
        }
    }

}
