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
 
// Normalization map for brand name, (I am not clear if this is only for Babē or all letters like ā, ē, etc.)
const normalizationMap: { [key: string]: string } = {
    'Babē': 'Babe'
}

function normalizeBrandName(input: string): string {
    let normalized = input
    for (const [key, value] of Object.entries(normalizationMap)) {
        normalized = normalized.replace(new RegExp(key, 'g'), value)
    }
    return normalized
}

// Words to ignore in brand matching
const ignoreWords = new Set<string>(['BIO', 'NEB'])

// front words that must appear at the start
const prefixWords = new Set<string>(['RICH', 'RFF', 'flex', 'ultra', 'gum', 'beauty', 'orto', 'free', '112', 'kin', 'happy'])

// front or second words
const positionSensitiveWords = new Set<string>(['heel', 'contour', 'nero', 'rsv'])

// exact matched brands
const exactMatchedBrands = new Set<string>(['HAPPY'])
export async function getBrandsMapping(): Promise<{ mapping: BrandsMapping, groupMap: Map<string, string> }> {
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
        // Normalize the brand names then convert to lowercase
        const brand1 = normalizeBrandName(manufacturer_p1).toLowerCase()
        const brands2 = normalizeBrandName(manufacturers_p2).toLowerCase()
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

    const groupMap = new Map<string, string>()
    brandMap.forEach((_, brand) => {
        const relatedBrands = getRelatedBrands(brandMap, brand)
        // Use the alphabetically first brand as the canonical brand for the group
        const canonicalBrand = Array.from(relatedBrands).sort()[0]
        relatedBrands.forEach(b => groupMap.set(b, canonicalBrand))
        flatMap.set(brand, relatedBrands)
    })

    // Convert the flat map to an object for easier usage
    const flatMapObject: Record<string, string[]> = {}

    flatMap.forEach((relatedBrands, brand) => {
        flatMapObject[brand] = Array.from(relatedBrands)
    })

    return { mapping: flatMapObject, groupMap }
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

    const { mapping: brandsMapping, groupMap } = await getBrandsMapping()

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

                // Skip ignored words
                if (ignoreWords.has(brand.toUpperCase())) {
                    continue
                }

                // Normalize brand and title for matching
                const normalizedBrand = normalizeBrandName(brand)
                const normalizedTitle = normalizeBrandName(product.title)

                
                const isBrandMatch = checkBrandIsSeparateTerm(normalizedTitle, normalizedBrand)

                if (!isBrandMatch) {
                    continue
                }

                if (exactMatchedBrands.has(normalizedBrand) && !new RegExp(`\\b${normalizedBrand}\\b`).test(normalizedTitle)) {
                    continue
                }

                // Validate position-sensitive words
                const words = normalizedTitle.toLowerCase().split(/\s+/)
                const brandWords = normalizedBrand.toLowerCase().split(/\s+/)
                const firstBrandWord = brandWords[0]

                // Prefix words must be at the start
                if (prefixWords.has(firstBrandWord) && words[0] !== firstBrandWord) continue
                
                // Position-sensitive words must be at start or second word
                if (positionSensitiveWords.has(firstBrandWord) && 
                    words[0] !== firstBrandWord && 
                    words[1] !== firstBrandWord) continue

                if (isBrandMatch) {
                    matchedBrands.push(brand)
                }
            }
        }

         matchedBrands.sort((a, b) => {
            const aAtStart = product.title.toLowerCase().startsWith(a.toLowerCase()) ? -1 : 1
            const bAtStart = product.title.toLowerCase().startsWith(b.toLowerCase()) ? -1 : 1
            return aAtStart - bAtStart
        })

        // Use the canonical brand from the group
        const matchedBrand = matchedBrands.length ? matchedBrands[0] : null
        const brand = matchedBrand ? groupMap.get(matchedBrand) || matchedBrand : null

        console.log(`${product.title} -> ${brand ? [brand] : []}`)
        const sourceId = product.source_id
        const meta = { matchedBrands }
        const key = `${source}_${countryCode}_${sourceId}`
        const uuid = stringToHash(key)

        // Then brand is inserted into product mapping table
    }
}
