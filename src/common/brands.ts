import { Job } from "bullmq";
import { countryCodes, dbServers, EngineType } from "../config/enums";
import { ContextType } from "../libs/logger";
import {
    jsonOrStringForDb,
    jsonOrStringToJson,
    stringOrNullForDb,
    stringToHash,
} from "../utils";
import _ from "lodash";
import { sources } from "../sites/sources";
import items from "./../../pharmacyItems.json";
import connections from "./../../brandConnections.json";

type BrandsMapping = {
    [key: string]: string[];
};

// Normalizes a string by removing diacritical marks and converting to lowercase
export function normalizeString(str: string): string {
    return str
        .normalize("NFD") // 1. Normalize to decomposed form (NFD)
        .replace(/[\u0300-\u036f]/g, "") // 2. Remove diacritical marks (accents)
        .toLowerCase(); // 3. Convert to lowercase
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
    const brandConnections = connections;

    const getRelatedBrands = (
        map: Map<string, Set<string>>,
        brand: string
    ): Set<string> => {
        const relatedBrands = new Set<string>();
        const queue = [brand];
        while (queue.length > 0) {
            const current = queue.pop()!;
            if (map.has(current)) {
                const brands = map.get(current)!;
                for (const b of brands) {
                    if (!relatedBrands.has(b)) {
                        relatedBrands.add(b);
                        queue.push(b);
                    }
                }
            }
        }
        return relatedBrands;
    };

    // Create a map to track brand relationships
    const brandMap = new Map<string, Set<string>>();

    brandConnections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
        const brand1 = manufacturer_p1.toLowerCase();
        const brands2 = manufacturers_p2.toLowerCase();
        const brand2Array = brands2.split(";").map((b) => b.trim());
        if (!brandMap.has(brand1)) {
            brandMap.set(brand1, new Set());
        }
        brand2Array.forEach((brand2) => {
            if (!brandMap.has(brand2)) {
                brandMap.set(brand2, new Set());
            }
            brandMap.get(brand1)!.add(brand2);
            brandMap.get(brand2)!.add(brand1);
        });
    });

    // Build the final flat map
    const flatMap = new Map<string, Set<string>>();

    brandMap.forEach((_, brand) => {
        const relatedBrands = getRelatedBrands(brandMap, brand);
        flatMap.set(brand, relatedBrands);
    });

    // Convert the flat map to an object for easier usage
    const flatMapObject: Record<string, string[]> = {};

    flatMap.forEach((relatedBrands, brand) => {
        flatMapObject[brand] = Array.from(relatedBrands);
    });

    return flatMapObject;
}

async function getPharmacyItems(
    countryCode: countryCodes,
    source: sources,
    versionKey: string,
    mustExist = true
) {
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
    const finalProducts = items;

    return finalProducts;
}

// This function checks if the brand is at the beginning, end, or a separate term in the input string (basically product title)
export function checkBrandIsSeparateTerm(
    input: string,
    brand: string
): boolean {
    // Escape any special characters in the brand name for use in a regular expression
    const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Check if the brand is at the beginning or end of the string
    const atBeginningOrEnd = new RegExp(
        `^(?:${escapedBrand}\\s|.*\\s${escapedBrand}\\s.*|.*\\s${escapedBrand})$`,
        "i"
    ).test(input);

    // Check if the brand is a separate term in the string
    const separateTerm = new RegExp(`\\b${escapedBrand}\\b`, "i").test(input);

    // The brand should be at the beginning, end, or a separate term
    return atBeginningOrEnd || separateTerm;
}

// This function checks if the brand is at the beginning, end, or a separate term in the input string with exact case matching
export function checkBrandIsSeparateTermWithExactCase(
    input: string,
    brand: string
): boolean {
    // Escape any special characters in the brand name for use in a regular expression
    const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Check if the brand is at the beginning or end of the string
    const atBeginningOrEnd = new RegExp(
        `^(?:${escapedBrand}\\s|.*\\s${escapedBrand}\\s.*|.*\\s${escapedBrand})$`
    ).test(input);

    // Check if the brand is a separate term in the string
    const separateTerm = new RegExp(`\\b${escapedBrand}\\b`).test(input);

    // The brand should be at the beginning, end, or a separate term
    return atBeginningOrEnd || separateTerm;
}

export async function assignBrandIfKnown(
    countryCode: countryCodes,
    source: sources,
    job?: Job
) {
    const context = { scope: "assignBrandIfKnown" } as ContextType;

    const brandsMapping = await getBrandsMapping();

    const versionKey = "assignBrandIfKnown";
    let products = await getPharmacyItems(
        countryCode,
        source,
        versionKey,
        false
    );
    let counter = 0;

    // Task 1 constraints data
    const ignoreBrands = ["bio", "neb"];
    const frontBrands = [
        "rich",
        "rff",
        "flex",
        "ultra",
        "gum",
        "beauty",
        "orto",
        "free",
        "112",
        "kin",
        "happy",
    ];
    const frontOrSecondBrands = ["heel", "contour", "nero", "rsv"];
    const exactCapitalizationBrands = ["HAPPY"];

    for (let product of products) {
        counter++;

        if (product.m_id) {
            // Already exists in the mapping table, probably no need to update
            continue;
        }

        let matchedBrands: string[] = [];
        for (const brandKey in brandsMapping) {
            const relatedBrands = brandsMapping[brandKey];
            for (const brand of relatedBrands) {
                if (matchedBrands.includes(brand)) {
                    continue;
                }

                // Task 1, TODO-2: Skip if the brand is in the ignore list
                if (ignoreBrands.includes(normalizeString(brand))) {
                    continue;
                }

                // Task 1, TODO-1: Handle special case like Babē = Babe
                // Normalize both strings by removing diacritics for comparison
                const normalizedTitle = normalizeString(product.title);
                const normalizedBrand = normalizeString(brand);

                let isBrandMatch = false;

                // Task 1, TODO-6: Handle case-sensitive matching for capitalized brands
                if (exactCapitalizationBrands.includes(brand)) {
                    // For brands requiring exact capitalization, use case-sensitive matching
                    isBrandMatch = checkBrandIsSeparateTermWithExactCase(
                        product.title,
                        brand
                    );
                } else {
                    // For other brands, use case-insensitive matching
                    isBrandMatch = checkBrandIsSeparateTerm(
                        normalizedTitle,
                        normalizedBrand
                    );
                }

                // Task 1, TODO-3 & 4: Check position constraints for specific brands only if the brand is matched already by other conditions
                if (isBrandMatch) {
                    // Split the title into words for position checking
                    const words = normalizedTitle.trim().split(/\s+/);

                    // Todo-3: For brands that must be at the front
                    if (frontBrands.includes(normalizedBrand)) {
                        // Check if the first word matches the brand
                        if (words.length > 0 && words[0] !== normalizedBrand) {
                            isBrandMatch = false;
                        }
                    }

                    // For brands that can be at the front or second position
                    if (frontOrSecondBrands.includes(normalizedBrand)) {
                        // Check if the second word matches the brand
                        let isFirstWordMatched = true;
                        let isSecondWordMatched = true;

                        if (words.length > 0 && words[0] !== normalizedBrand) {
                            isFirstWordMatched = false;
                        }

                        if (words.length > 1 && words[1] !== normalizedBrand) {
                            isSecondWordMatched = false;
                        }

                        isBrandMatch =
                            isFirstWordMatched || isSecondWordMatched;
                    }
                }

                if (isBrandMatch) {
                    matchedBrands.push(brand);
                }
            }
        }

        // Task 1, TODO-5: If multiple brands matched, prioritize matching at the beginning
        if (matchedBrands.length > 1) {
            // Sort brands by their position in the title (those at the beginning come first)
            const normalizedProductTitle = normalizeString(product.title);
            matchedBrands.sort((a, b) => {
                const posA = normalizedProductTitle.indexOf(normalizeString(a));
                const posB = normalizedProductTitle.indexOf(normalizeString(b));
                return posA - posB;
            });
        }

        console.log(`${product.title} -> ${_.uniq(matchedBrands)}`);
        const sourceId = product.source_id;
        const meta = { matchedBrands };
        const brand = matchedBrands.length ? matchedBrands[0] : null;

        const key = `${source}_${countryCode}_${sourceId}`;
        const uuid = stringToHash(key);

        // Then brand is inserted into product mapping table
    }
}
