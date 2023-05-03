import { checkColumnsIfModified } from ".";
import { formatPrice } from "../numerals";
import { AggregatorItem, AggregatorSourceItem } from "../types/items/aggregatorItem";

const columnsNeedToCheckForAggregator: Array<keyof AggregatorItem> = [
    "brand",
    "model",
    "declaredUpdated",
    "declaredProductCode"
]


function isChangedAggregator(processedItem: AggregatorItem, dbItem: AggregatorItem): string {

    let modifiedFields: string[] = checkColumnsIfModified(columnsNeedToCheckForAggregator, processedItem, dbItem)

    if (processedItem.countryCode && processedItem.countryCode !== dbItem.countryCode) {
        throw `isChangedAggregator got different country codes! ID=${dbItem.id}: ${dbItem.countryCode} vs ${processedItem.countryCode}`
    }

    return modifiedFields.join(',')
}


const columnsNeedToCheckForAggregatorSource: Array<keyof AggregatorSourceItem> = [
    "price",
    "inStock",
    "priceType",
    "title",
    "url"
]

function isChangedAggregatorSource(processedItem: AggregatorSourceItem, dbItem: AggregatorSourceItem): string {
    let modifiedFields: string[] = checkColumnsIfModified(columnsNeedToCheckForAggregatorSource, processedItem, dbItem)

    if (processedItem.countryCode && processedItem.countryCode !== dbItem.countryCode) {
        throw `isChangedAggregatorSource got different country codes! ID=${dbItem.id}: ${dbItem.countryCode} vs ${processedItem.countryCode}`
    }

    return modifiedFields.join(',')
}

export {
    isChangedAggregator,
    isChangedAggregatorSource
}