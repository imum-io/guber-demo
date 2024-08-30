"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isChangedAggregatorSource = exports.isChangedAggregator = void 0;
const _1 = require(".");
const columnsNeedToCheckForAggregator = [
    "brand",
    "model",
    "declaredUpdated",
    "declaredProductCode"
];
function isChangedAggregator(processedItem, dbItem) {
    let modifiedFields = (0, _1.checkColumnsIfModified)(columnsNeedToCheckForAggregator, processedItem, dbItem);
    if (processedItem.countryCode && processedItem.countryCode !== dbItem.countryCode) {
        throw `isChangedAggregator got different country codes! ID=${dbItem.id}: ${dbItem.countryCode} vs ${processedItem.countryCode}`;
    }
    return modifiedFields.join(',');
}
exports.isChangedAggregator = isChangedAggregator;
const columnsNeedToCheckForAggregatorSource = [
    "price",
    "inStock",
    "priceType",
    "title",
    "url"
];
function isChangedAggregatorSource(processedItem, dbItem) {
    let modifiedFields = (0, _1.checkColumnsIfModified)(columnsNeedToCheckForAggregatorSource, processedItem, dbItem);
    if (processedItem.countryCode && processedItem.countryCode !== dbItem.countryCode) {
        throw `isChangedAggregatorSource got different country codes! ID=${dbItem.id}: ${dbItem.countryCode} vs ${processedItem.countryCode}`;
    }
    return modifiedFields.join(',');
}
exports.isChangedAggregatorSource = isChangedAggregatorSource;
//# sourceMappingURL=aggregator-common.js.map