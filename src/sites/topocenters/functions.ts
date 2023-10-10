import { PageResponseTOP } from "./pageTypes";
import queryString from 'query-string'
import { TOPTesting } from "./sample";
import { AdResponseTOP } from "./adTypes";
import { HomeAppliencesType } from "../../types/items/homeAppliencesItem";
import { matchLabelTranslation } from "../../utils";
// import { isChangedHomeAppliences } from "../../common/homeAppliences-common";


export class TOPFunctions {

    private labelTranslations = {
        brand: {
            lt: 'Prekės ženklas',
        },
        model: {
            lt: 'Modelis',
        },
        width: {
            lt: 'Plotis'
        },
        height: {
            lt: 'Aukštis'
        },
        depth: {
            lt: 'Gylis'
        },
        weight: {
            lt: 'Sausų skalbinių kiekis'
        },
        color: {
            lt: 'Spalva'
        },
        length: {
            lt: 'Ilgis'
        },
        power: {
            lt: 'Galia'
        },
        dimensions: {
            lt: 'Matmenys'
        }

    }

    public isJson(vehicleType, url) {
        return url.includes("topocentras.lt/graphql")
    }


    public getNextPageUrlJson(json: PageResponseTOP, url) {
        const split = url.split('?')

        const params = queryString.parse(split[1])
        let vars

        if (typeof params.vars == 'string') {
            vars = JSON.parse(params.vars)
        }


        if (((vars.pageSize * vars.currentPage) < json.data.products.total_count) && vars) {
            vars.currentPage = vars.currentPage + 1
            return `${split[0]}?${queryString.stringify({ ...params, vars: JSON.stringify(vars) })}`
        }
        return undefined
    }

    public addItemsJson(response: PageResponseTOP, idUrls: any, url: string) {
        let products = response.data.products.items

        for (let product of products) {
            if (product.id && product.url_key) {
                idUrls[product.id] = `https://www.topocentras.lt/graphql?query=ROOT_GetProduct&vars={"id":"${product.id}"}`
            }
        }
    }



    scrapeHomeAppliancesJson(response: AdResponseTOP, url): HomeAppliencesType<string> {
        const item = {} as HomeAppliencesType<string>

        const productDetail = response.data.productDetail?.items[0]

        item.title = productDetail?.name
        item.sourceId = productDetail?.id?.toString()
        item.price = this.checkZero(productDetail?.price_range.maximum_price?.regular_price?.value) || 0
        item.discountPrice = this.checkZero(productDetail?.special_price)
        item.discountType = productDetail?.price_range?.maximum_price?.discount?.__typename
        item.memberPrice = this.checkZero(productDetail?.topo_club_price)

        if (item.discountPrice == item.price) {
            item.discountPrice = undefined
        }

        item.inStock = productDetail?.stock_status === 'IN_STOCK'

        item.finalPrice = item.discountPrice || item.memberPrice || item.price

        item.brand = productDetail?.brand
        item.model = productDetail?.manufacturer_code
        item.barcode = productDetail?.barcode

        item.productCode = productDetail?.sku

        for (const feature of productDetail?.visible_on_front) {
            const label = feature.label
            const value = feature.value

            for (let key in this.labelTranslations) {
                if (matchLabelTranslation(label, this.labelTranslations[key], true)) {
                    if (!item[key]) {
                        item[key] = value

                        if (key == 'width' || key == 'height' || key == 'depth' || key == 'length') {
                            item[key] = (Number(item[key]) * 10).toString()
                        }
                    }
                }
            }
        }

        const category = productDetail?.categories.find(category => category.breadcrumbs)


        if (category) {
            if (category.breadcrumbs.length >= 3) {
                item.subsubsubcategory = category.name
                item.subsubcategory = category.breadcrumbs[2].category_name
                item.subcategory = category.breadcrumbs[1].category_name
                item.category = category.breadcrumbs[0].category_name
            } else if (category.breadcrumbs.length == 2) {
                item.subsubcategory = category.name
                item.subcategory = category.breadcrumbs[1].category_name
                item.category = category.breadcrumbs[0].category_name
            } else if (category.breadcrumbs.length == 1) {
                item.subcategory = category.name
                item.category = category.breadcrumbs[0].category_name
            } else if (category.breadcrumbs.length > 0) {
                item.category = category.name
            }
        }

        item.extendedUrl = `https://www.topocentras.lt/${productDetail?.url_key}.html`

        item.meta = {}

        let specification = {}
        productDetail?.visible_on_front?.forEach(item => {
            let label = item.label
            let value = item.value
            if(label.length && value.length) {
                specification[label] = value
            }
        })

        item.meta = {...item.meta, specification}

        return item
    }

    public isAdRemovedJson(json: AdResponseTOP) {
        return Boolean(json?.data?.productDetail?.items?.length === 0)
    }

    public isAdModified(currentItem, previousItem): string {
        // return isChangedHomeAppliences(currentItem, previousItem)
        return ""
    }

    private checkZero(price: number) {
        let priceString
        if (price && price != 0) {
            priceString = price.toFixed(2)
        }
        return priceString
    }


    async testing(autoLunch = true) {
        return new TOPTesting(autoLunch)
    }


}