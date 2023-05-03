import { countryCodes } from "../../config/enums"

/** For Aggregator Types integration */
export type AggregatorItem<T = string> = {
    id?: number

    added: T

    title: T

    brand?: T

    model?: T

    declaredProductCode?: T 

    declaredUpdated?: T 

    category: T

    subcategory?: T
    
    subsubcategory?: T

    subsubsubcategory?: T

    url?: T

    source: string

    sourceId: T

    countryCode: countryCodes

    meta?: string | object
}

/** For Aggregator Source Types integration */
export type AggregatorSourceItem<T = string> = {
    id?: number

    added: string

    title: string

    price?: T | number

    priceType?: string

    inStock: boolean | number

    url?: string

    source: string

    sourceId: string

    subsourceId: string

    subsource: string

    countryCode: countryCodes

    meta?: string | object

    linkedCountryCode: countryCodes

    linkedSource: string

    linkedSourceId: string

}