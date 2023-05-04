import { getBaseUrl, getCountryCode, getNodeText, matchLabelTranslation, stringToHash } from '../../utils'
import { AggregatorInterface } from '../interfaces';
import { SLDTesting } from './sample';
import { countryCodes, vehicleTypes } from '../../config/enums';
import { CheerioAPI } from 'cheerio';
import cookiesArray from './cookies.json'
import { isChangedAggregator, isChangedAggregatorSource } from '../../common/aggregator-common';
import moment from 'moment';
export class SLDFuntions implements AggregatorInterface {
    public headers = {
    }
    public useHeadless = true
    public isXmlMode: boolean = false
    public fetchDomOnly = false

    public cookies = cookiesArray

    constructor() {
        for (let cookie of this.cookies) {
            if (cookie.expires) {
                cookie.expires = moment().add(1, 'years').unix()
            }
        }
    }

    public urlToSourceId(url: string) {
        const regex = /^(https:\/\/www\.salidzini\.lv\/cena\?q=[\w]+)/
        const match = url.match(regex)
        const sourceId = stringToHash(match[0])
        return sourceId
    }

    public supportsType(vehicleType) {
        return vehicleType == vehicleTypes.aggregator || vehicleType == vehicleTypes.aggregatorSource
    }
    public labelTranslations = {
        inStock: {
            lv: 'Noliktavā',
        }
    }

    public scrapeAggregatorItem($, url, adLinkMeta) {
        let item: any = {}
        item.title = getNodeText($('h1'))
        item.sourceId = this.urlToSourceId(url)
        item.countryCode = getCountryCode(countryCodes, url)
        let requiredTagNames = {
            title: 'h2.item_name',
            url: 'a.item_link',
            inStocktext: '.item_delivery_stock_frame .item_stock',
            subsource: '.item_shop_name_frame .item_shop_name',
            price: '.item_price',
            mainContainer: 'div[itemprop="offers"] .item_box_main'
        }

        item.brand = adLinkMeta?.brand
        item.model = adLinkMeta?.model
        item.declaredProductCode = adLinkMeta?.barcode

        item.meta = {
            adLinkMeta
        }
        let baseUrl = getBaseUrl(url)
        item.subItems = {
            aggregatorSource: this.aggregatorSourceDetails($, $(requiredTagNames.mainContainer), item.sourceId, requiredTagNames, baseUrl)
        }
        return item
    }

    public getNextPageUrl($, url) {
        if (Array.from($('a.page.underline')).length > 0 && $(`img[src="/images/arrow_next.png"]`).length > 0) {
            const nextPageEl = $('a.page.underline').filter(function () {
                return $(this).find('img[src="/images/arrow_next.png"]').length > 0;
            });
            let nextPagePath = nextPageEl.attr('href')
            if (nextPagePath) {
                let baseUrl = getBaseUrl(url)
                let nextPageUrl = baseUrl + '/cena' + nextPagePath
                return nextPageUrl
            }
        }
        return undefined
    }

    public addItems($, idUrls, url, adLinkMeta) {
        let title = getNodeText($('h1'))
        let id = this.urlToSourceId(url)
        idUrls[id] = url
        
        idUrls.parsedItem = this.scrapeAggregatorItem($, url, adLinkMeta)
    }

    public isAdModified(currentItem, previousItem): string {
        return isChangedAggregator(currentItem, previousItem)
    }

    public isSubitemModified(currentItem, previousItem) {
        return isChangedAggregatorSource(currentItem, previousItem)
    }

    public isAdRemoved($) {
        return false
    }

    private aggregatorSourceDetails($: CheerioAPI, infoContainer, sourceId: string, requiredTagNames, baseUrl) {
        let dataArray: any = []
        infoContainer.each((i, elem) => {
            let priceType: string = 'member_price'
            let inStock = true
            let title = $(requiredTagNames.title, elem)?.text()
            let url = baseUrl + $(requiredTagNames.url, elem)?.attr('href')
            let inStocktext = $(requiredTagNames.inStocktext, elem)?.text()
            let subsource = $(requiredTagNames.subsource, elem)?.text()
            let price = $(`${requiredTagNames.price} span[itemprop="price"]`, elem)?.attr('content') || $(`${requiredTagNames.price}`, elem)?.text()
            price = price?.match(/^[0-9.]+$/)?.[0]
            let subsourceId: string = stringToHash(subsource + title)
            let meta = { position: i }

            // if (matchLabelTranslation(inStocktext, this.labelTranslations.inStock, true)) {
            //     inStock = true
            // }
            dataArray.push({
                title,
                url,
                sourceId,
                subsource,
                subsourceId,
                inStock,
                price,
                priceType,
                meta,
            })
        })
        return dataArray
    }

    public async testing() {
        new SLDTesting();
    }

}
