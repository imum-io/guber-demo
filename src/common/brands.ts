import { Job } from "bullmq"
import { countryCodes, dbServers, EngineType } from "../config/enums"
import { ContextType } from "../libs/logger"
import { jsonOrStringForDb, jsonOrStringToJson, stringOrNullForDb, stringToHash } from "../utils"
import _ from "lodash"
import { sources } from "../sites/sources"
import items from "./../../pharmacyItems.json"
import connections from "./../../brandConnections.json"

type BrandsMapping = {
    [key: string]: string[]
}

export async function getBrandsMapping(): Promise<BrandsMapping> {
//     type of connection is -> { manufacturer_p1: string, manufacturers_p2: string}[]
    const brandConnections = connections

    const getRelatedBrands = (map: Map<string, Set<string>>, brand: string): Set<string> => {
        const relatedBrands = new Set<string>()
        const queue = [brand]
        while (queue.length > 0) {
            const current = queue.pop()!
            if (map.has(current)) {
                const brands = map.get(current)!
                for (const b of brands) {
                    if (!relatedBrands.has(b)) {
                        relatedBrands.add(b)
                        queue.push(b)
                    }
                }
            }
        }
        return relatedBrands
    }

    // Create a map to track brand relationships
    // for this map manufacturer_p1 is the key
    // manufacturers_p2 is multiple brands separated by ; (connected brands)
    // if connected-brands(brands from manufacturers_p2) are not in the map we add it
    // the value of the map is a set of connected brands
    // that means-> p1 will have every brands from p2 and vice versa
    const brandMap = new Map<string, Set<string>>()

    brandConnections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
        const brand1 = manufacturer_p1.toLowerCase()
        const brands2 = manufacturers_p2.toLowerCase()
        const brand2Array = brands2.split(";").map((b) => b.trim())
        if (!brandMap.has(brand1)) {
            brandMap.set(brand1, new Set())
        }
        brand2Array.forEach((brand2) => {
            if (!brandMap.has(brand2)) {
                brandMap.set(brand2, new Set())
            }
            brandMap.get(brand1)!.add(brand2)
            brandMap.get(brand2)!.add(brand1)
        })
    })

    // Build the final flat map
    const flatMap = new Map<string, Set<string>>()

    brandMap.forEach((_, brand) => {
        const relatedBrands = getRelatedBrands(brandMap, brand)
        flatMap.set(brand, relatedBrands)
    })

    // Convert the flat map to an object for easier usage
    const flatMapObject: Record<string, string[]> = {}

    flatMap.forEach((relatedBrands, brand) => {
        flatMapObject[brand] = Array.from(relatedBrands)
    })

    return flatMapObject
}

async function getPharmacyItems(countryCode: countryCodes, source: sources, versionKey: string, mustExist = true) {
    //     let query = `
    //     SELECT
    //     p.url, p.removed_timestamp, p.title, p.source_id
    //     , p.manufacturer
    //     , map.source_id m_id
    //     , map.source
    //     , map.country_code
    //     , map.meta
    // FROM
    //     property_pharmacy p
    // left join pharmacy_mapping map on p.source_id = map.source_id and p.source = map.source and p.country_code = map.country_code
    // WHERE
    //     p.newest = TRUE
    //     and p.country_code = '${countryCode}'
    //     and p.source = '${source}'
    //     and p.removed_timestamp is null
    //     and (p.manufacturer is null or p.manufacturer in ('nera', 'kita', 'cits'))
    //     ORDER BY p.removed_timestamp IS NULL DESC, p.removed_timestamp DESC
    //     `
    //     let products = await executeQueryAndGetResponse(dbServers.pharmacy, query)
    //     for (let product of products) {
    //         product.meta = jsonOrStringToJson(product.meta)
    //     }

    //     let finalProducts = products.filter((product) => (!mustExist || product.m_id) && !product.meta[versionKey])
    const finalProducts = items

    return finalProducts
}

export function checkBrandIsSeparateTerm(input: string, brand: string): boolean {
    // Escape any special characters in the brand name for use in a regular expression
    const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    // Check if the brand is at the beginning or end of the string
    const atBeginningOrEnd = new RegExp(
        `^(?:${escapedBrand}\\s|.*\\s${escapedBrand}\\s.*|.*\\s${escapedBrand})$`,
        "i"
    ).test(input)

    // Check if the brand is a separate term in the string
    const separateTerm = new RegExp(`\\b${escapedBrand}\\b`, "i").test(input)

    // The brand should be at the beginning, end, or a separate term
    return atBeginningOrEnd || separateTerm
}

export async function assignBrandIfKnown(countryCode: countryCodes, source: sources, job?: Job) {
    const context = { scope: "assignBrandIfKnown" } as ContextType

    const brandsMapping = await getBrandsMapping()

    const versionKey = "assignBrandIfKnown"
    let products = await getPharmacyItems(countryCode, source, versionKey, false)
    let counter = 0
    for (let product of products) {
        counter++

        if (product.m_id) {
            // Already exists in the mapping table, probably no need to update
            continue
        }

        let matchedBrands = []
        for (const brandKey in brandsMapping) {
            const relatedBrands = brandsMapping[brandKey]
            for (const brand of relatedBrands) {
                if (matchedBrands.includes(brand)) {
                    continue
                }
                const isBrandMatch = checkBrandIsSeparateTerm(product.title, brand)
                if (isBrandMatch) {
                    matchedBrands.push(brand)
                }
            }
        }
        console.log(`${product.title} -> ${_.uniq(matchedBrands)}`)
        const sourceId = product.source_id
        const meta = { matchedBrands }
        const brand = matchedBrands.length ? matchedBrands[0] : null

        const key = `${source}_${countryCode}_${sourceId}`
        const uuid = stringToHash(key)

        // for now lets make sense the data structure first
        if(counter > 3960) {
            break
        }

        // Then brand is inserted into product mapping table
    }
}
