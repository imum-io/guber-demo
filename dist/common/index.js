"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeMeta = exports.checkColumnsIfModified = exports.getLastUpdateInterval = exports.checkEqualJSON = exports.isChangedVehicles = exports.isChanged = exports.getSourceFunction = void 0;
const enums_1 = require("../config/enums");
const sites_1 = require("../sites");
const utils_1 = require("../utils");
const is_equal_1 = __importDefault(require("is-equal"));
const lodash_1 = __importDefault(require("lodash"));
const logger_1 = __importDefault(require("../libs/logger"));
/**
 * part of the returned object is config that might be modified at some point, i.e. useHeadless param
 * @param source - the source
 * @returns A new object which has all source config.
 */
function getSourceFunction(source) {
    if (!sites_1.functions[source]) {
        let errorMessage = `No functions for source ${source}`;
        logger_1.default.error(errorMessage);
        throw new Error(errorMessage);
    }
    let currentClass = sites_1.functions[source];
    let sourceFunctions = new currentClass();
    return sourceFunctions;
}
exports.getSourceFunction = getSourceFunction;
function isChanged(processedItem, dbItem, sourceFunctions) {
    let modifiedFields = sourceFunctions.isAdModified(processedItem, dbItem);
    if (modifiedFields) {
        console.log("source says item changed");
    }
    return modifiedFields;
}
exports.isChanged = isChanged;
function isChangedVehicles(processedItem, dbItem) {
    var _a, _b;
    let modifiedFields = [];
    let isSameNet = (0, utils_1.isSamePrice)(processedItem.priceNet, dbItem.priceNet);
    let isSameGross = (0, utils_1.isSamePrice)(processedItem.priceGross, dbItem.priceGross);
    let bothExist = Boolean(processedItem.priceNet && processedItem.priceGross);
    let bothExistOld = Boolean(dbItem.priceNet && dbItem.priceGross);
    if ((bothExist && !isSameNet && !isSameGross) || (!bothExist && (!isSameNet || !isSameGross)) || (bothExist && !bothExistOld)) {
        // Only consider price changed if both GROSS AND NET mismatch - because of currency conversions
        // Item was updated. Fully update, add versioning stuff, newest flag
        modifiedFields.push('price');
    }
    if (dbItem.removedTimestamp) {
        console.log("was removed, should be restored");
        // Was removed but now not removed
        modifiedFields.push('removedTimestamp');
    }
    if (processedItem.linkId && !dbItem.linkId) {
        console.log("simply adding linkId");
        modifiedFields.push('linkId');
    }
    const currentMileage = Math.round(Number((_a = dbItem.mileage) !== null && _a !== void 0 ? _a : 0));
    const processedMileage = Math.round(Number((_b = processedItem.mileage) !== null && _b !== void 0 ? _b : 0));
    if (processedMileage != currentMileage) {
        modifiedFields.push('mileage');
    }
    if ((0, utils_1.isDifferentDate)(processedItem.constructionYear, dbItem.constructionYear)) {
        console.log("constructionYear changed");
        modifiedFields.push('constructionYear');
    }
    if ((0, utils_1.isDifferentDate)(processedItem.firstReg, dbItem.firstReg)) {
        console.log("firstReg changed");
        modifiedFields.push('firstReg');
    }
    return modifiedFields.join(',');
}
exports.isChangedVehicles = isChangedVehicles;
function checkEqualJSON(current, previous) {
    let currrentJSON = current;
    let previousJSON = previous;
    if (lodash_1.default.isNil(current) && lodash_1.default.isNil(previous)) {
        return false;
    }
    if (typeof currrentJSON === 'string') {
        currrentJSON = JSON.parse(currrentJSON);
    }
    if (typeof previousJSON === 'string') {
        previousJSON = JSON.parse(previousJSON);
    }
    return !(0, is_equal_1.default)(currrentJSON, previousJSON);
}
exports.checkEqualJSON = checkEqualJSON;
function mergeMeta(newMeta, previousMeta) {
    if (!newMeta && previousMeta) {
        return previousMeta;
    }
    if (newMeta && previousMeta) {
        let merged = Object.assign(Object.assign({}, (0, utils_1.jsonOrStringToJson)(previousMeta)), (0, utils_1.jsonOrStringToJson)(newMeta));
        return (0, utils_1.jsonOrStringForDb)(merged);
    }
    return newMeta;
}
exports.mergeMeta = mergeMeta;
// For update items - when fetching not updated items (which are probably removed). For sources with daily updates, last update is smaller (i.e. trucks)
// while for rarely updated things, doesn't make sense to re-validate product too often (i.e. homeappliances once/week)
function getLastUpdateInterval(vehicleType) {
    // TODO: later these values will be controlled via unleash feature flags
    if (vehicleType == enums_1.vehicleTypes.homeAppliances) {
        return 7;
    }
    else if (vehicleType == enums_1.vehicleTypes.truck || vehicleType == enums_1.vehicleTypes.trailer) {
        return 2;
    }
    return 5;
}
exports.getLastUpdateInterval = getLastUpdateInterval;
function checkColumnsIfModified(columnsNeedToCheck, processedItem, dbItem) {
    let modifiedFields = [];
    for (let index = 0; index < columnsNeedToCheck.length; index++) {
        const column = columnsNeedToCheck[index];
        if (processedItem[column] != dbItem[column]) {
            modifiedFields.push(column);
        }
    }
    return modifiedFields;
}
exports.checkColumnsIfModified = checkColumnsIfModified;
//# sourceMappingURL=index.js.map