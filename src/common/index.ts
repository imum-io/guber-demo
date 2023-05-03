import { countryCodes, dbModels, vehicleTypes } from "../config/enums"
import { functions } from "../sites"
import { isDifferentDate, isSamePrice, jsonOrStringForDb, jsonOrStringToJson } from "../utils"
import isEqual from 'is-equal'
import _ from 'lodash'
import Logger from "../libs/logger"
import { CommonInterface } from "../sites/interfaces"
import { sources } from "../sites/sources"

/**
 * part of the returned object is config that might be modified at some point, i.e. useHeadless param
 * @param source - the source
 * @returns A new object which has all source config.
 */
function getSourceFunction(source): CommonInterface {

    if (!functions[source]) {
        let errorMessage = `No functions for source ${source}`
        Logger.error(errorMessage)
        throw new Error(errorMessage)
    }

    let currentClass = functions[source]
    let sourceFunctions: CommonInterface = new currentClass()
    return sourceFunctions
}

function isChanged(processedItem: any, dbItem: any, sourceFunctions: CommonInterface): string {
    let modifiedFields = sourceFunctions.isAdModified(processedItem, dbItem)
    if (modifiedFields) {
        console.log("source says item changed")
    }
    return modifiedFields
}

function isChangedVehicles(processedItem: any, dbItem: any): string {

    let modifiedFields: string[] = []

    let isSameNet = isSamePrice(processedItem.priceNet, dbItem.priceNet)
    let isSameGross = isSamePrice(processedItem.priceGross, dbItem.priceGross)

    let bothExist = Boolean(processedItem.priceNet && processedItem.priceGross)
    let bothExistOld = Boolean(dbItem.priceNet && dbItem.priceGross)

    if ((bothExist && !isSameNet && !isSameGross) || (!bothExist && (!isSameNet || !isSameGross)) || (bothExist && !bothExistOld)) {
        // Only consider price changed if both GROSS AND NET mismatch - because of currency conversions
        // Item was updated. Fully update, add versioning stuff, newest flag
        modifiedFields.push('price')
    }
    if (dbItem.removedTimestamp) {
        console.log("was removed, should be restored")
        // Was removed but now not removed
        modifiedFields.push('removedTimestamp')
    }
    if (processedItem.linkId && !dbItem.linkId) {
        console.log("simply adding linkId")
        modifiedFields.push('linkId')
    }

    const currentMileage = Math.round(Number(dbItem.mileage ?? 0))
    const processedMileage = Math.round(Number(processedItem.mileage ?? 0))
    if (processedMileage != currentMileage) {
        modifiedFields.push('mileage')
    }
    if (isDifferentDate(processedItem.constructionYear, dbItem.constructionYear)) {
        console.log("constructionYear changed")
        modifiedFields.push('constructionYear')
    }
    if (isDifferentDate(processedItem.firstReg, dbItem.firstReg)) {
        console.log("firstReg changed")
        modifiedFields.push('firstReg')
    }

    return modifiedFields.join(',')
}

function checkEqualJSON(current, previous) {
    let currrentJSON = current
    let previousJSON = previous

    if (_.isNil(current) && _.isNil(previous)) {
        return false
    }

    if (typeof currrentJSON === 'string') {
        currrentJSON = JSON.parse(currrentJSON)
    }

    if (typeof previousJSON === 'string') {
        previousJSON = JSON.parse(previousJSON)
    }

    return !isEqual(currrentJSON, previousJSON)
}

function mergeMeta(newMeta?: string, previousMeta?: string): string | undefined {
    if (!newMeta && previousMeta) {
        return previousMeta
    }

    if (newMeta && previousMeta) {
        let merged = { ...jsonOrStringToJson(previousMeta), ...jsonOrStringToJson(newMeta) }
        return jsonOrStringForDb(merged)
    }

    return newMeta
}

// For update items - when fetching not updated items (which are probably removed). For sources with daily updates, last update is smaller (i.e. trucks)
// while for rarely updated things, doesn't make sense to re-validate product too often (i.e. homeappliances once/week)
function getLastUpdateInterval(vehicleType: dbModels): number {
    // TODO: later these values will be controlled via unleash feature flags
    if (vehicleType == vehicleTypes.homeAppliances) {
        return 7
    }
    else if (vehicleType == vehicleTypes.truck || vehicleType == vehicleTypes.trailer) {
        return 2
    }
    return 5
}

function checkColumnsIfModified(columnsNeedToCheck: any[], processedItem: any, dbItem: any) {
    let modifiedFields: string[] = []
    for (let index = 0; index < columnsNeedToCheck.length; index++) {
        const column = columnsNeedToCheck[index];
        if (processedItem[column] != dbItem[column]) {
            modifiedFields.push(column)
        }
    }
    return modifiedFields
}

export {
    getSourceFunction,
    isChanged,
    isChangedVehicles,
    checkEqualJSON,
    getLastUpdateInterval,
    checkColumnsIfModified,
    mergeMeta
}

