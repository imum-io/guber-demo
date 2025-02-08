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
    //     const query = `
    //     SELECT
    //     LOWER(p1.manufacturer) manufacturer_p1
    //     , LOWER(GROUP_CONCAT(DISTINCT p2.manufacturer ORDER BY p2.manufacturer SEPARATOR ';')) AS manufacturers_p2
    // FROM
    //     property_matchingvalidation v
    // INNER JOIN
    //     property_pharmacy p1 ON v.m_source = p1.source
    //     AND v.m_source_id = p1.source_id
    //     AND v.m_country_code = p1.country_code
    //     AND p1.newest = true
    // INNER JOIN
    //     property_pharmacy p2 ON v.c_source = p2.source
    //     AND v.c_source_id = p2.source_id
    //     AND v.c_country_code = p2.country_code
    //     AND p2.newest = true
    // WHERE
    //     v.m_source = 'AZT'
    //     AND v.engine_type = '${EngineType.Barcode}'
    //     and p1.manufacturer is not null
    //     and p2.manufacturer is not null
    //     and p1.manufacturer not in ('kita', 'nera', 'cits')
    //     and p2.manufacturer not in ('kita', 'nera', 'cits')
    // GROUP BY
    //     p1.manufacturer
    //     `
    //     const brandConnections = await executeQueryAndGetResponse(dbServers.pharmacy, query)
    // For this test day purposes exported the necessary object
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

export function checkIfBrandMatched(input: string, brand: string): number {
    let brandLowerCase = brand.toLowerCase()

    let ignoreRules = new Set<string>(["bio","neb"])
    if(ignoreRules.has(brandLowerCase)) return -1

    //HAPPY should be matched Capitalized, and HAPPY should be first
    if (brandLowerCase === "happy") {
        let match = /HAPPY/.exec(input)
        return match !== null ? match.index : -1
    }

    //Normalize input, Ref: https://stackoverflow.com/a/45053429
    let normalizedInput = _.deburr(input.normalize("NFKD"))

    // Check if the brand is in atTheFrontRules, then it must satisfy the rule
    let atTheFrontRules = new Set<string>(["rich", " rff", " flex", " ultra", " gum", " beauty", " orto", " free", " 112", " kin", "happy"])
    if ( atTheFrontRules.has(brandLowerCase) ) {
        if (normalizedInput.toLowerCase().startsWith(brandLowerCase) ) return 0
    }

    // Escape any special characters in the brand name for use in a regular expression
    const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    // Check if the brand is in atTheFrontOrSecondRules, then it must satisfy the rule
    let atTheFrontOrSecondRules = new Set<string>(["heel", " contour", " nero", " rsv"])
    if (atTheFrontOrSecondRules.has(brandLowerCase)) {
        let match = new RegExp(`^(?:${escapedBrand}\\b|\\w+\\s+${escapedBrand}\\b)`, 'i').exec(normalizedInput);
        return match !== null ? match.index : -1
    }

    // Check if the brand is at the beginning or end of the string
    let match = new RegExp(
        `^(?:${escapedBrand}\\s|.*\\s${escapedBrand}\\s.*|.*\\s${escapedBrand})$`,
        "i"
    ).exec(normalizedInput);
    const atBeginningOrEnd = match !== null ? match.index : -1

    // Check if the brand is a separate term in the string
    match = new RegExp(`\\b${escapedBrand}\\b`, "i").exec(normalizedInput);
    const separateTerm = match !== null ? match.index : -1

    // The brand should be at the beginning, end, or a separate term
    if (atBeginningOrEnd === -1 && separateTerm === -1) return -1;
    if (atBeginningOrEnd === -1) return separateTerm;
    if (separateTerm === -1) return atBeginningOrEnd;
    return Math.min(atBeginningOrEnd, separateTerm);
}

function matchBrandsByProduct(brandsMapping: BrandsMapping, product: any): string[] {
    let matchedBrands = []
    // to check already visited brands, using set as O(1) read
    let visitedBrands = new Set<string>

    for (const brandKey in brandsMapping) {
        const relatedBrands = brandsMapping[brandKey]
        for (const brand of relatedBrands) {
            // No need to revisit the same brand twice, this solves a huge performance issue in the original code
            if (visitedBrands.has(brand)) {
                continue
            }
            visitedBrands.add(brand)
            const matchedIndex = checkIfBrandMatched(product.title, brand)
            if (matchedIndex > -1) {
                matchedBrands.push({brand,matchedIndex})
            }
        }
    }
    return matchedBrands.sort((a, b) => a.matchedIndex - b.matchedIndex).map(item => item.brand)
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

        let matchedBrands = matchBrandsByProduct(brandsMapping, product);
        // console.log(`${product.title} -> ${_.uniq(matchedBrands)}`)
        console.log(`${product.title} -> ${matchedBrands}`)
        const sourceId = product.source_id
        const meta = { matchedBrands }
        const brand = matchedBrands.length ? matchedBrands[0] : null

        const key = `${source}_${countryCode}_${sourceId}`
        const uuid = stringToHash(key)

        // Then brand is inserted into product mapping table
    }
}
