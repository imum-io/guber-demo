import { CheerioAPI } from 'cheerio'
import { dbServers, vehicleTypes } from '../../config/enums'
import { ContextType } from '../../libs/logger'
import { getHTML, getResponseWithOptions } from '../../network-utils'
import { sources } from '../sources'
import { ELDFunctions } from './functions'
import { IdUrlsType } from '../../types/common'

export class ELDTesting {
  sourceFunctions: ELDFunctions;
  context: ContextType = {
    url: '',
    source: sources.ELD,
    vehicleType: vehicleTypes.pharmacy,
    sourceId: null,
    dbServer: dbServers.local,
    itemId: null
  }
  idUrls: IdUrlsType = {}

  constructor() {
    this.sourceFunctions = new ELDFunctions()

    // all test should done here. The ultimate test zone
    this.testing()
  }

  async testing() {    
    await this.testAddItems()
    await this.testScrapePharmacyItem()
  }

  async testAddItems() {
    try {
        let url = "https://www.eurokos.lt/veidui/prausikliai-ir-valikliai/prausikliai/"

        while(true) {
            const { $ }: { $: CheerioAPI } = await getHTML(url, this.sourceFunctions, { source: sources.ELD })
            this.sourceFunctions.addItems($, this.idUrls)
            let nextPageUrl = this.sourceFunctions.getNextPageUrl($)            
            if (!nextPageUrl) break;
            url = nextPageUrl
        }

        console.log("item urls with id", this.idUrls)
    } catch (error) {
        console.log('failed to testAddItems')
    }
  }

  async testScrapePharmacyItem() {
    try {
      console.log('length', Object.keys(this.idUrls).length);
      
        Object.keys(this.idUrls).forEach(async (id) => {
          console.log("id", id);
          
          let url = this.idUrls[id]
          const { $ }: { $: CheerioAPI } = await getHTML(url, this.sourceFunctions, { source: sources.ELD })
          let parsedItem = this.sourceFunctions.scrapePharmacyItem($, id)
          console.log("parsedItem", parsedItem)
        })
    } catch (error) {
        console.log('failed to testScrapePharmacyItem')
    }
  }

}


