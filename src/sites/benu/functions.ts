import { getBaseUrl, getNodeText, jsonEscape, matchLabelTranslation } from '../../utils'
import { getResponseWithOptions } from '../../network-utils'
import cheerio, { CheerioAPI } from 'cheerio'
import isEqual from 'is-equal'
import { PharmacyInterface } from '../interfaces'
import { BNUTesting } from './sample'
import { PharmacyItem } from '../../types/items/pharmacyItem'
// import { isChangedPharmacy } from '../../common/pharmacy-common'
import { vehicleTypes } from '../../config/enums'
// import { parseDimensions } from '../../product-matching/match-rules'


export class BNUFunctions implements PharmacyInterface {

    public useHeadless = false
    public cookies = undefined
    public headers = {
        'Accept-Language': 'en-us',
    }

    private quantityLeftMaxValue = 6
    private countryCodes = {
        lt: 'LT',
        lv: 'LV',
        ee: 'EE'
    }

    public supportsType(vehicleType) {
        return vehicleType == vehicleTypes.images
    }

    public labelTranslations = {
        'form': {
            lt: 'Forma',
            lv: 'Forma',
            ee: 'Vorm',
        },
        'quantity': {
            lt: 'Kiekis',
            lv: 'Tilpums',
            ee: 'Mõõt',
        },
        'activeSubtance': {
            lt: 'Veikliosios medžiagos',
            lv: 'Aktīvā viela',
            ee: 'Toimeaine',
        },
        'activeSubtanceStrength': {
            lt: 'Veikliosios medžiagos stiprumas',
            lv: 'Aktīvās vielas stiprums',
            ee: 'Toimeaine sisaldus',
        },
        'manufacturer': {
            lt: 'Prekinis ženklas',
            lv: 'Zīmols',
            ee: 'Kaubamärk'
        },
        'amountInPackage': {
            lt: 'Kiekis pakuotėje',
            lv: 'Skaits iepakojumā',
            ee: 'Kogus pakis'
        },
        isRemovedText: {
            lt: 'Visos prekės',
            lv: 'E - APTIEKA',
            ee1: 'Tooted',
            ee2: 'Kaugmüüki teostab Ülemiste Tervisemaja Apteek'
        }
    }

    private basicPostRequestOptions() {
        const body = new URLSearchParams()
        body.append("_intuero[appName]", "benu- eshop - lt")
        body.append("_intuero[env]", "prod")
        body.append("_intuero[mID]", '2097')

        body.append("_intuero[mType]", "productsPage")
        body.append("_intuero[lang]", "lt")

        return {
            method: 'POST',
            // uri: "https://www.benu.lt/core/defaultActions/ajax/helper.ajax.php",
            headers: {
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
            body,
        }
    }

    private scrapePharmacyItemSync($: CheerioAPI, url, sourceId, quantityLeft): PharmacyItem {
        let item = {} as PharmacyItem

        item.title = getNodeText($('.bnSingleProduct__title > h1:first'))

        $('script').each((i, elem) => {
            let text = $(elem).html()
            if (text.includes('EANCode')) {
                let startindex = text.indexOf('EANCode') + 10

                if (text[startindex - 1] == 'n') {
                    return
                }
                item.barcode = ''
                for (let idx = startindex; idx < text.length; idx++) {
                    if (text[idx] == `"`) {
                        break
                    }
                    item.barcode += text[idx]
                }
            }
        })
        item.description = getNodeText($('.col > div > #fullDescription .contentTab__content'))
        item.productUse = getNodeText($('.col > div > #usage .contentTab__content'))
        item.composition = getNodeText($('.col > div > #composition .contentTab__content'))

        item.category = getNodeText($(`.bnSingleProduct__category .row div:nth-child(1)`))
        item.discountType = $('.bnProductDiscountBubble').first()?.text()?.trim()


        const priceWrap = $('.bnPriceBox__price').first()
        item.discountPrice = $('.price--new', priceWrap).first()?.text()?.trim()

        if (item.discountPrice) {
            item.price = $('.price--old', priceWrap).first()?.text()?.trim()
        } else {
            item.price = $('.pric', priceWrap).first()?.text()?.trim()
        }
        item.memberPrice = $('.price--card .money_amount', priceWrap).first()?.text()?.trim()

        // when there is no discount price, use regular price
        if (!item.price) {
            item.price = item.discountPrice
            item.discountPrice = undefined
        }

        item.finalPrice = item.discountPrice || item.memberPrice || item.price

        //item.pictures
        item.other = getNodeText($('.bnSingleProduct__description'))

        let inStockContainer = $('.bnPriceBox__addToCart')
        if ($('.bind-addToCart', inStockContainer).hasClass('bnButton--green')) {
            item.inStock = true
        } else if ($('.bnPriceBox__outOfStockText')) {
            item.inStock = false
        } else {
            item.inStock = null
        }

        $('.attributesTable').find('tr').each((i, elem) => {
            let label = $(elem).find('th').text()
            let value = $(elem).find('td').text().trim()

            if (matchLabelTranslation(label, this.labelTranslations['form'])) {
                item.form = value
            } else if (matchLabelTranslation(label, this.labelTranslations['amountInPackage'])) {
                item.amountInPackage = value
            } else if (matchLabelTranslation(label, this.labelTranslations['quantity'])) {
                item.quantity = value
            } else if (matchLabelTranslation(label, this.labelTranslations['activeSubtanceStrength'])) {
                item.activeSubstanceStrength = value
            } else if (matchLabelTranslation(label, this.labelTranslations['activeSubtance'])) {
                item.activeSubstance = value
            } else if (matchLabelTranslation(label, this.labelTranslations['manufacturer'])) {
                item.manufacturer = value
            }
        })

        //get additional information
        let additionalInformation = {}
        let additionalInformationProperty = []
        let additionalInformationValues = []
        $('.contentTab__content > .attributesTable > tbody > tr > th').each((i, element) => {
            const $element = $(element)
            additionalInformationProperty.push($element.text().trim().replace(/\'/g, ""))
        })

        $('.contentTab__content > .attributesTable > tbody > tr > td').each((i, element) => {
            const $element = $(element)
            additionalInformationValues.push($element.text().trim().replace(/\'/g, ""))
        })

        additionalInformationProperty.forEach((e, i) => {
            additionalInformation[e] = jsonEscape(additionalInformationValues[i])
        })

        item.additionalInformation = additionalInformation

        //get other params
        let otherParams = {}
        let otherParamsProperty = []
        let otherParamsValues = []
        $('.singleProduct__attributes > .attributesTable > tbody > tr > th').each((i, element) => {
            const $element = $(element)
            otherParamsProperty.push($element.text().trim().replace(/\'/g, ""))
        })

        $('.singleProduct__attributes > .attributesTable > tbody > tr > td').each((i, element) => {
            const $element = $(element)
            otherParamsValues.push($element.text().trim().replace(/\'/g, ""))
        })

        otherParamsProperty.forEach((e, i) => {
            otherParams[e] = otherParamsValues[i]
        })

        item.otherParams = otherParams

        //item.sellerTitle
        item.suggestions = getNodeText($('.alert__text'))
        item.deliveryInfo = getNodeText($('.bnPriceBox__deliveryInfo'))
        //item.otherProducts

        item.countryCode = this.getCountryCode(url)

        //item.url
        item.sourceId = sourceId
        item.quantityLeft = quantityLeft

        // item.dimensions = parseDimensions(item.title)

        let imageUrls = []
        $('.bnSingleProductGallery__image').find('img').each((indx, elem) => {
            let imageUrl = $(elem).attr('src')
            if (imageUrl) {
                imageUrl = getBaseUrl(url) + '/' + imageUrl
                imageUrls.push(imageUrl)
            }
        })
        item.imageUrls = imageUrls

        return item
    }

    public async scrapePharmacyItem($, url) {
        let sourceId = $(".bnBoughtTogether").attr('id') || $('input[name="productData_productID"]').val()
        // let sourceId = $('input[name="productDataMass_productID"]')[0].attribs.value
        let quantityLeft = await this.getQuantityLeftJson(sourceId, url)

        return this.scrapePharmacyItemSync($, url, sourceId, quantityLeft)
    }

    public getNextPageUrl(response, url) {
        let nextPageUrl;

        if (!response || response["return"]["products"].length !== 0) {
            nextPageUrl = url
        } else {
            nextPageUrl = undefined
        }

        return nextPageUrl;
    }

    hasNextPageByOptions(url) {
        return true
    }

    public getNextPageByOptions(prevPageOptions) {

        let nextPageOptions: any = {}
        if (prevPageOptions) {
            let pageNumber = parseInt(prevPageOptions.body.get("args[options][page]"))
            nextPageOptions = prevPageOptions
            nextPageOptions.body.set("args[options][page]", pageNumber + 1)
        } else {
            nextPageOptions = this.basicPostRequestOptions()
            nextPageOptions.body.append("className", "Products")
            nextPageOptions.body.append("methodName", "loadProductsPageDraw")
            nextPageOptions.body.append("args[rules][tag][]", "")
            nextPageOptions.body.append("args[options][pageSize]", "54")
            nextPageOptions.body.append("args[options][group]", "list")
            nextPageOptions.body.append("args[options][categoryID]", "2097")
            nextPageOptions.body.append("args[options][resume]", "1")
            nextPageOptions.body.append("args[options][loadMore]", "1")
            nextPageOptions.body.append("args[options][screenWidth]", "1792")
            nextPageOptions.body.append("args[options][page]", "1")
        }

        return nextPageOptions
    }

    public isAdModified(currentItem: PharmacyItem, previousItem: PharmacyItem): string {
        // return isChangedPharmacy(currentItem, previousItem)
        return ""
    }

    public addItems(response, idUrls) {
        let $ = cheerio.load(response["return"]["products"])
        const items = $('.productItem')

        items.each((i, item: any) => {
            const itemUrl = $(item).find('a').attr('href')
            const id = item.attribs['data-productid']

            if (idUrls[id]) {
                console.log("already exists " + itemUrl)
            }

            idUrls[id] = itemUrl
        })
    }

    public getPostUrl(url) {
        return "https://www.benu.lt/core/defaultActions/ajax/helper.ajax.php"
    }

    public isAdRemoved($) {
        const title = $('h1').text()
        return Boolean($.statusCode === 404) || matchLabelTranslation(title, this.labelTranslations.isRemovedText)
    }

    //---------------------- helper functions------------------//
    private getManufacturerTranslations() {
        return 'Prekinis ženklas'
    }

    private getCountryCode(url) {
        const baseUrl = url.split('/')[2]
        const countryCodeFromUrl = baseUrl.split('.').slice(-1)

        return this.countryCodes[countryCodeFromUrl]
    }

    private async getQuantityLeftJson(id, url) {
        let baseUrl = getBaseUrl(url)
        let quantityLeft = {}
        const options = this.getOptionsForQuantityLeft(id)
        url = baseUrl + '/core/defaultActions/ajax/helper.ajax.php'

        const { data } = await getResponseWithOptions(url, options)
        if (data.return) {
            // Make sure item has locations
            const $ = cheerio.load(data.return)

            const rows = $("tr")
            for (let i = 0; i < rows.length; i++) {
                let row = rows[i]
                if (row.children.length === 1) { // contains only city name
                    const cityName = this.getCityName(row)
                    const pharmaciesObject = this.getPharmaciesForACity(rows, i)
                    quantityLeft[cityName] = pharmaciesObject.pharmacies
                    i = pharmaciesObject.iterator - 1 // for will iterate to the next city item
                }
            }

        }

        return quantityLeft
    }

    private getOptionsForQuantityLeft(id) {
        let options = this.basicPostRequestOptions()
        options.body.append("methodName", "drawPharmaciesQnts")
        options.body.append("args[prID]", id)

        return options
    }

    private getCityName(trElement) {
        return trElement.children[0].children[0].children[0].data
    }

    private getPharmaciesForACity(rows, iterator) {
        iterator++ // move to the next row to get the details from the while block
        let row = rows[iterator]
        let pharmacies = []
        while (row.children.length !== 1) {
            const pharmacyDetails = this.getDetailsForAPharmacy(row)
            pharmacies.push(pharmacyDetails)
            iterator++
            if (iterator === rows.length) { // break at the last element
                break
            }
            row = rows[iterator]
        }
        return { pharmacies, iterator }
    }

    // element has either 3 or 4 children
    private getDetailsForAPharmacy(trElement) {
        let details: any = {}
        let positionOfLocation = 0
        if (trElement.children.length === 4) { // first children is the city name. so skip
            positionOfLocation++
        }

        details.location = trElement.children[positionOfLocation++]?.children[0].children[0].data
        details.updatedDate = trElement.children[positionOfLocation++]?.children[0].data
        const amountLeftString = trElement.children[positionOfLocation++]?.children[0].data
        details.surplus = amountLeftString?.indexOf('+') === 1
        details.amountLeft = details.surplus ? this.quantityLeftMaxValue : amountLeftString?.match(/\d+/)[0]

        return details
    }

    public async testing() {
        new BNUTesting();
    }
}
