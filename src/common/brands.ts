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

type UnionFindState = {
    parent: Record<string, string>;
};

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

const brandNormalizationMap: Record<string, string> = { "Babē": "Babe" };
const ignoredBrands = ["BIO", "NEB"];
const frontOnlyBrands = ["RICH", "RFF", "flex", "ultra", "gum", "beauty", "orto", "free", "112", "kin", "happy"];
const frontOrSecondOnlyBrands = ["heel", "contour", "nero", "rsv"];

export function checkBrandIsSeparateTerm(input: string, brand: string): boolean {

    // Normalize brand
    const normalizedBrand = brandNormalizationMap[brand] || brand;

    // Skip ignored brands
    if (ignoredBrands.includes(normalizedBrand.toUpperCase())) {
        return false;
    }

    // Case-sensitive match for "HAPPY"
    if (normalizedBrand === "HAPPY" && !/\bHAPPY\b/.test(input)) {
        return false;
    }

    // Lowercased word-split input for position checks
    const words = input.toLowerCase().split(/\s+/);

    //Lowercased brand name
    const brandLower = normalizedBrand.toLowerCase();

    // Only match if it's the first word
    if (frontOnlyBrands.includes(brandLower)) {
        return _.first(words) === brandLower;
    }

    // Only match if it's first or second word
    if (frontOrSecondOnlyBrands.includes(brandLower)) {
        return _.first(words) === brandLower || _.nth(words, 1) === brandLower;
    }

    // Escape any special characters in the brand name for use in a regular expression
    const escapedBrand = normalizedBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    const regex = new RegExp(`\\b${escapedBrand}\\b`, "i");
    return regex.test(input);
}

// create or initialize unionFind
function createUnionFind(): UnionFindState {
    return { parent: {} };
}

// set item in unionFinder 
function union(state: UnionFindState, x: string, y: string): void {
    const rootX = find(state, x);
    const rootY = find(state, y);
    if (rootX !== rootY) {
        const canonical = rootX < rootY ? rootX : rootY;
        state.parent[rootX] = canonical;
        state.parent[rootY] = canonical;
    }
}

// find item in the unionFinder
function find(state: UnionFindState, x: string): string {
    if (!(x in state.parent)) {
        state.parent[x] = x;
    }
    if (state.parent[x] !== x) {
        state.parent[x] = find(state, state.parent[x]);
    }
    return state.parent[x];
}

export async function assignBrandIfKnown(countryCode: countryCodes, source: sources, job?: Job) {
    const context = { scope: "assignBrandIfKnown" } as ContextType

    const unionFinder = createUnionFind();

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
        const uniqueMatchedBrands = _.uniq(matchedBrands)
        console.log(`${product.title} -> ${uniqueMatchedBrands}`)

        if (!_.isEmpty(uniqueMatchedBrands)) {
            uniqueMatchedBrands.forEach((matchedBrand) => {
                union(unionFinder, _.first(uniqueMatchedBrands), matchedBrand)
            })
        }

        const sourceId = product.source_id
        const meta = { matchedBrands }
        const brand = matchedBrands.length ? find(unionFinder, matchedBrands[0]) : null

        const key = `${source}_${countryCode}_${sourceId}`
        const uuid = stringToHash(key)

        console.log(`${uuid} -> ${key} -> ${brand}`)

        // Then brand is inserted into product mapping table
    }
}
