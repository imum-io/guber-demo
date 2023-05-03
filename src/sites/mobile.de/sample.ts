import { CheerioAPI } from 'cheerio'
import { dbServers, jobTypes, vehicleTypes } from '../../config/enums'
import Logger, { ContextType } from '../../libs/logger'
import { getHTML, getJson } from '../../network-utils'
import { writeJsonIntoFile } from '../../utils'
import { sources } from '../sources'
import { MDEFunctions } from './functions'

export class MDEtesting {
    sourceFunctions: MDEFunctions
    context: ContextType = {
        url: '',
        source: sources.MDE,
        vehicleType: vehicleTypes.trailer,
        sourceId: null,
        dbServer: dbServers.local,
        itemId: null
    }

    constructor() {
        this.sourceFunctions = new MDEFunctions()

        // all test should done here. The ultimate test zone
        this.testing()
    }

    async testing() {
        // await this.test_ad()
        // await this.test_fetching_json_page()
        await this.test_processor_page_parsing()
    }

    async test_ad() {
        let url = "https://suchen.mobile.de/fahrzeuge/details.html?id=352248990&isSearchRequest=true&makeModelVariant1.makeId=13800&makeModelVariant1.modelDescription=SDP&minFirstRegistrationDate=2012-01-01&pageNumber=1&scopeId=ST&action=topOfPage&top=1:1&searchId=40ea1d83-e73a-b22b-1392-145fd49f527f&ref=srp"
        url = this.sourceFunctions.updateUrl(url)
        // console.log(url);

        let json = await getJson(url, this.sourceFunctions.headers, false, { source: sources.MDE })
        // writeJsonIntoFile(json.data, 'data.json')
        let parsedItem = this.sourceFunctions.scrapeTrailerJson(json.data)
        // console.log(parsedItem);

        for (let item of parsedItem) {
            console.log("processedItem", item)
        }
    }

    async test_fetching_json_page() {
        let url = "https://m.mobile.de/svc/s/?top&ps=0&tic&psz=20&vc=Car&ms=22900;10;;&dam=0&p=0%3A1000000&fr=2013:&sb=doc&od=down"
        while (url) {
            let json = await getJson(url, true);
            console.log(json.data);

            url = this.sourceFunctions.getNextPageUrlJson(json.data, url)
            console.log('json', json)
            console.log("next page", url);
        }
    }
    async test_total_ad_count() {
        const jsonURL = "https://m.mobile.de/svc/s/?top&ps=0&tic&psz=20&vc=Car&ms=3500;10;;&dam=0&p=0%3A1000000&fr=2002:&sb=doc&od=down" //JSON URL

        const htmlUrl = "https://suchen.mobile.de/fahrzeuge/search.html?fr=2014%3A&isSearchRequest=true&ms=25100%3B%3B%3BFH%3B&pw=350%3A409&ref=dsp&s=Truck&vc=SemiTrailerTruck&wf=WHEEL_DRIVE_6x2"
        // const htmlUrl = 'https://suchen.mobile.de/fahrzeuge/search.html?ax=2%3A2&c=StandardTractorAndTrailerUnit&dam=0&fr=2014%3A&isSearchRequest=true&ms=17200%3B%3B%3BActros%3B&od=down&p=10000%3A&pw=309%3A409&s=Truck&sb=doc&vc=SemiTrailerTruck'
        const { $ } = await getHTML(htmlUrl, this.sourceFunctions)
        const count = this.sourceFunctions.getAdsCount($)
        Logger.info(count, "getAdsCount")
    }

    async test_processor_page_parsing() {
        this.context.url = "https://m.mobile.de/svc/s/?top&ps=0&tic&psz=20&vc=Car&ms=17200;136;;&dam=0&p=0%3A1000000&fr=2012:&sb=doc&od=down"
        this.context.dbServer = dbServers.cars
        this.context.vehicleType = vehicleTypes.car
        this.context.linkId = "1093"
        let proxyConfig = { source: sources.MDE, itemId: '4', retries: 1 }
        let { data } = await getJson(this.context.url, this.sourceFunctions.headers, false, proxyConfig);
        let idUrls = {}
        await this.sourceFunctions.addItemsJson(data, idUrls, this.context.url)
        if (this.sourceFunctions.supportScrapeList(this.context.vehicleType)) {
            console.log(idUrls)
        }
        else {
            throw "Wrong result"
        }
    }
}


