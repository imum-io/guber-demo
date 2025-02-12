import { Job } from "bullmq"
import { countryCodes, dbServers, EngineType } from "../config/enums"
import { ContextType } from "../libs/logger"
import { jsonOrStringForDb, jsonOrStringToJson, stringOrNullForDb, stringToHash } from "../utils"
import _ from "lodash"
import { sources } from "../sites/sources"
import items from "../data/pharmacyItems.json"
import connections from "../data/brandConnections.json"
import brandsMap from "../data/brandsMapping.json"

type BrandsMapping = {
    [key: string]: string[]
}

// First task - Rule 1: Brand name normalization mapping
// Maps special brand name variations to their normalized form while preserving case
const NORMALIZED_BRANDS = {
    'Babē': 'Babe',
    // Add other brand normalizations here
}

// First task - Rule 2: Brands to be ignored during matching
// These brands are too generic or cause false positives
const IGNORED_BRANDS = ['BIO', 'NEB']

// First task - Rule 3: Brands that must appear as the first word in title
// These brands are only valid if they appear at the start of the product title
const MUST_BE_FIRST_WORD = ['RICH', 'RFF', 'flex', 'ultra', 'gum', 'beauty', 'orto', 'free', '112', 'kin', 'happy']

// First task - Rule 4: Brands that must appear as first or second word
// These brands are only valid if they appear at the start or as second word
const MUST_BE_FIRST_OR_SECOND = ['heel', 'contour', 'nero', 'rsv']

// First task - Rule 6: Brands that require exact case matching
// These brands must match exactly with their uppercase version
const CASE_SENSITIVE_BRANDS = ['HAPPY']

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

// SUGGESTIONS FOR IMPROVEMENT: Consider using a single RegExp with capture groups instead of two separate checks
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

// Add this new helper function for case-preserving normalization
function normalizePreservingCase(text: string, searchTerm: string, replacement: string): string {
    // Create case-insensitive regex with capture for first letter
    const regex = new RegExp(searchTerm, 'gi')

    return text.replace(regex, (match) => {
        // If original match was uppercase, make replacement uppercase
        if (match === match.toUpperCase()) {
            return replacement.toUpperCase()
        }
        // If original match was lowercase, make replacement lowercase
        if (match === match.toLowerCase()) {
            return replacement.toLowerCase()
        }
        // If original match was title case, make replacement title case
        if (match[0] === match[0].toUpperCase()) {
            return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase()
        }
        return replacement
    })
}

// First task: Brand validation rules
// This function implements 4 validation rules:
// 2. Ignore specific brands (BIO, NEB)
// 3. Brands that must be the first word (RICH, RFF, flex, etc)
// 4. Brands that must be first or second word (heel, contour, nero, rsv)
// 6. Case-sensitive brand matching (HAPPY)
export function validateBrandPosition(brand: string, title: string): boolean {
    const words = title.split(/\s+/)
    const lowerBrand = brand.toLowerCase()

    // 2 NO LOGIC: Check IGNORED_BRANDS
    if (IGNORED_BRANDS.includes(brand.toUpperCase())) {
        return false
    }

    // 6 NO LOGIC: Check case-sensitive brands
    if (CASE_SENSITIVE_BRANDS.includes(brand.toUpperCase()) && !title.includes(brand.toUpperCase())) {
        return false
    }

    // 3 NO LOGIC: Check position requirements
    if (MUST_BE_FIRST_WORD.includes(lowerBrand)) {
        return words[0].toLowerCase() === lowerBrand
    }

    // 4 NO LOGIC: Check position requirements
    if (MUST_BE_FIRST_OR_SECOND.includes(lowerBrand)) {
        return words[0].toLowerCase() === lowerBrand || words[1]?.toLowerCase() === lowerBrand
    }

    return true
}

// Second task: Consistent brand group assignment
export function getNormalizedBrandGroup(brand: string, brandsMapping: BrandsMapping): string {
    // Get all related brands from the pre-computed mapping
    const relatedBrands = brandsMapping[brand] || []

    // If no related brands found, return the original brand
    if (relatedBrands.length === 0) {
        return brand
    }

    // Sort all brands alphabetically to ensure consistent selection
    // Always take the first one as the canonical brand name
    return [...relatedBrands, brand].sort((a, b) => a.localeCompare(b))[0]
}

export async function assignBrandIfKnown(countryCode: countryCodes, source: sources, job?: Job) {
    const context = { scope: "assignBrandIfKnown" } as ContextType

    // const brandsMapping = await getBrandsMapping()
    const brandsMapping = brandsMap

    const versionKey = "assignBrandIfKnown"
    let products = await getPharmacyItems(countryCode, source, versionKey, false)
    let counter = 0
    for (let product of products) {
        counter++

        if (product.m_id) {
            // Already exists in the mapping table, probably no need to update
            continue
        }

        // 1 NO LOGIC: Normalize brand if needed
        let normalizedTitle = product.title
        for (const [searchTerm, replacement] of Object.entries(NORMALIZED_BRANDS)) {
            normalizedTitle = normalizePreservingCase(normalizedTitle, searchTerm, replacement)
        }

        let matchedBrands = []
        for (const brandKey in brandsMapping) {
            const relatedBrands = brandsMapping[brandKey]
            for (let brand of relatedBrands) {
                if (matchedBrands.includes(brand)) {
                    continue
                }

                // Validate brand position using normalized title
                if (!validateBrandPosition(brand, normalizedTitle)) {
                    continue
                }

                const isBrandMatch = checkBrandIsSeparateTerm(normalizedTitle, brand)
                if (isBrandMatch) {
                    matchedBrands.push(brand)
                }
            }
        }

        // 5 NO LOGIC: Get the primary matched brand (first match without sorting by position)
        const primaryBrand = matchedBrands.length ? matchedBrands[0] : null

        // After finding matches, normalize to ensure consistent brand within group
        const normalizedBrand = primaryBrand ? getNormalizedBrandGroup(primaryBrand, brandsMapping) : null

        console.log(`${product.title} -> Original matches: ${_.uniq(matchedBrands)}, Primary brand: ${primaryBrand}, Normalized: ${normalizedBrand}`)
        const sourceId = product.source_id
        const meta = {
            matchedBrands,
            originalBrand: primaryBrand,  // The brand we initially matched
            normalizedBrand              // The consistent brand for the group
        }
        const brand = normalizedBrand    // Use normalized brand for assignment

        const key = `${source}_${countryCode}_${sourceId}`
        const uuid = stringToHash(key)

        // Then brand is inserted into product mapping table
    }
}
