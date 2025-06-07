import { Job } from "bullmq"
import { countryCodes, dbServers, EngineType } from "../config/enums"
import { ContextType } from "../libs/logger"
import { jsonOrStringForDb, jsonOrStringToJson, stringOrNullForDb, stringToHash } from "../utils"
import _ from "lodash"
import { sources } from "../sites/sources"
import items from "../../pharmacyItems.json"
import connections from "../../brandConnections.json"
import * as unorm from 'unorm';

// Helper function to fully normalize, strip diacritics, and convert to lowercase
function normalizeAndStripDiacritics(text: string | undefined | null): string {
    if (!text) return "";
    // NFKD normalize, then remove combining diacritical marks, then lowercase
    return unorm.nfkd(text)
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

// Helper function to normalize and tokenize text
function tokenize(text: string): string[] {
    if (!text) return [];
    return normalizeAndStripDiacritics(text)
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Remove common punctuation
        .split(/\s+/)
        .filter(token => token.length > 0);
}

const STARTS_WITH_KEYWORDS = ["rich", "rff", "flex", "ultra", "gum", "beauty", "orto", "free", "112", "kin", "happy"].map(k => normalizeAndStripDiacritics(k));
const START_OR_SECOND_WORD_KEYWORDS = ["heel", "contour", "nero", "rsv"].map(k => normalizeAndStripDiacritics(k));
const IGNORED_BRANDS = ["bio", "neb"].map(k => normalizeAndStripDiacritics(k));


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

export function checkBrandIsSeparateTerm(input: string, brand: string): boolean {
    const normalizedStrippedInput = normalizeAndStripDiacritics(input); // Normalize the input string to NFKD form
    const normalizedStrippedBrand = normalizeAndStripDiacritics(brand); // Normalize the brand name to NFKD form

    // Escape any special characters in the brand name for use in a regular expression
    const escapedBrand = normalizedStrippedBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    // Check if the brand is at the beginning or end of the string
    const atBeginningOrEnd = new RegExp(
        `^(?:${escapedBrand}\\s|.*\\s${escapedBrand}\\s.*|.*\\s${escapedBrand})$`,
        "i"
    ).test(normalizedStrippedInput)

    // Check if the brand is a separate term in the string
    const separateTerm = new RegExp(`\\b${escapedBrand}\\b`, "i").test(normalizedStrippedInput)

    // The brand should be at the beginning, end, or a separate term
    return atBeginningOrEnd || separateTerm
}

function processProductBrands(
    originalProductTitle: string,
    filteredBrandsMapping: BrandsMapping, // Already filtered for BIO/NEB keys/values
    context: ContextType // For potential future logging needs
): string | null {
    const normalizedStrippedTitle = normalizeAndStripDiacritics(originalProductTitle);
    const tokenizedTitle = tokenize(originalProductTitle);

    let potentialMatches: { brandName: string; matchStartIndex: number; originalBrandLength: number }[] = [];

    for (const brandKey in filteredBrandsMapping) {
        const relatedBrands = filteredBrandsMapping[brandKey];
        for (const originalBrandFromMapping of relatedBrands) {
            const normalizedStrippedBrand = normalizeAndStripDiacritics(originalBrandFromMapping);

            // Rule: "HAPPY" capitalization
            if (normalizedStrippedBrand === "happy" && !originalProductTitle.includes("HAPPY")) {
                continue;
            }

            // Rule: Prefix checks
            let prefixRuleMet = true;
            if (STARTS_WITH_KEYWORDS.includes(normalizedStrippedBrand)) {
                if (!tokenizedTitle.length || tokenizedTitle[0] !== normalizedStrippedBrand) {
                    prefixRuleMet = false;
                }
            } else if (START_OR_SECOND_WORD_KEYWORDS.includes(normalizedStrippedBrand)) {
                if (!tokenizedTitle.length || (tokenizedTitle[0] !== normalizedStrippedBrand && (tokenizedTitle.length < 2 || tokenizedTitle[1] !== normalizedStrippedBrand))) {
                    prefixRuleMet = false;
                }
            }
            if (!prefixRuleMet) {
                continue;
            }

            if (checkBrandIsSeparateTerm(originalProductTitle, originalBrandFromMapping)) {
                const matchIndex = normalizedStrippedTitle.indexOf(normalizedStrippedBrand);
                if (matchIndex !== -1) {
                    potentialMatches.push({
                        brandName: originalBrandFromMapping,
                        matchStartIndex: matchIndex,
                        originalBrandLength: originalBrandFromMapping.length
                    });
                }
            }
        }
    }

    if (potentialMatches.length > 0) {
        potentialMatches.sort((a, b) => {
            if (a.matchStartIndex !== b.matchStartIndex) {
                return a.matchStartIndex - b.matchStartIndex;
            }
            return b.originalBrandLength - a.originalBrandLength;
        });
        return potentialMatches[0].brandName;
    }
    return null;
}

export async function assignBrandIfKnown(countryCode: countryCodes, source: sources, job?: Job) {
    const context = { scope: "assignBrandIfKnown" } as ContextType

    const brandsMapping = await getBrandsMapping()

    const originalBrandsMapping = await getBrandsMapping()

    // Filter out ignored brands from the mapping
    const filteredBrandsMapping: BrandsMapping = {};
    for (const brandKey in originalBrandsMapping) {
        const normalizedStrippedBrandKey = normalizeAndStripDiacritics(brandKey);
        if (IGNORED_BRANDS.includes(normalizedStrippedBrandKey)) {
            continue;
        }
        const relatedBrands = originalBrandsMapping[brandKey]
            .map(brand => ({ original: brand, normalizedStripped: normalizeAndStripDiacritics(brand) }))
            .filter(brandObj => !IGNORED_BRANDS.includes(brandObj.normalizedStripped))
            .map(brandObj => brandObj.original);

        if (relatedBrands.length > 0) {
            filteredBrandsMapping[brandKey] = relatedBrands;
        }
    }

    const versionKey = "assignBrandIfKnown"
    let products = await getPharmacyItems(countryCode, source, versionKey, false)
    let counter = 0
    for (let product of products) {
        counter++

        if (product.m_id) {
            // Already exists in the mapping table, probably no need to update
            continue
        }

        const finalBrandName = processProductBrands(
            product.title,
            filteredBrandsMapping,
            context
        );
        console.log(`${product.title} -> ${finalBrandName || 'No brand matched'}`);
        const sourceId = product.source_id;
        let meta = typeof product.meta === 'string' ? jsonOrStringToJson(product.meta) : (product.meta || {});
        meta.matchedBrands = finalBrandName ? [finalBrandName] : [];

        const brand = finalBrandName; 

        const key = `${source}_${countryCode}_${sourceId}`
        const uuid = stringToHash(key)

        // Then brand is inserted into product mapping table
    }
}

// Export for testing purposes
export const _processProductBrands = processProductBrands;
