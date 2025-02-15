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

//If brand is matched, returns brand's index as a word in the input's word-list; -1 otherwise
export function getBrandMatchPosition(input: string, brand: string): number {
    let words: string[] = input.match(/\b\w+\b/g) || []

    if(words.length < 1) {
        return -1
    }

    if(brand === "babe" || brand === "babē") {
        let index = words.findIndex(word => word.toLowerCase() === "babe" || word.toLowerCase() === "babē")
        return index
    }

    const forbiddenBrands = ["bio", "neb"];
    if(forbiddenBrands.includes(brand)) {
        return -1
    }

    const validBrandsForFront = [
        "rich", "ref", "flex", "ultra", "gum", "beauty", "orto",
        "free", "112", "kin", "happy", "heel", "contour", "nero","rsv"
    ]
    if(validBrandsForFront.includes(brand) && brand === words[0].toLowerCase()) {
        return 0
    }

    const validBrandsAsSecondWord = ["heel", "contour", "nero", "rsv"]
    if(validBrandsAsSecondWord.includes(brand) && words.length > 1 && brand === words[1].toLowerCase()) {
        return 1
    }

    if(brand === "happy") {
        let index = words.findIndex(word => word === "HAPPY")
        return index
    }
    let index = words.findIndex(word => word.toLowerCase() === brand)
    return index
}

function getUniqueBrands(brandsMapping: BrandsMapping): Set<string> {
    const uniqueBrands = new Set<string>();

    for (const relatedBrands of Object.values(brandsMapping)) {
        for (const brand of relatedBrands) {
            uniqueBrands.add(brand);
        }
    }

    return uniqueBrands;
}

/*
Finding a single representative for every brand so that we can assign one representative
for all brands that exist in the same component / connected graph
*/
function getBrandRepresentatives(brands: Set<string>, brandsMapping: BrandsMapping) {
    let visited = new Set<string>()
    let brandRepresentative: Record<string, string> = {}
    
    function breadthFirstSearch(startBrand: string) {
        let queue: string[] = [startBrand]
        let component: string[] = []
        visited.add(startBrand)

        while (queue.length > 0) {
            let brand = queue.shift()!
            component.push(brand)
            let neighbors = brandsMapping[brand] || []
            for (let neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor)
                    queue.push(neighbor)
                }
            }
        }

        return component
    }

    for (let brand of brands) {
        if (!visited.has(brand)) {
            const component = breadthFirstSearch(brand)
            // Choose the first brand as the representative
            const representativeBrand = component[0]

            for (const brandInComponent of component) {
                brandRepresentative[brandInComponent] = representativeBrand
            }
        }
    }

    return brandRepresentative
}

export async function assignBrandIfKnown(countryCode: countryCodes, source: sources, job?: Job) {
    const context = { scope: "assignBrandIfKnown" } as ContextType

    const brandsMapping = await getBrandsMapping()

    const versionKey = "assignBrandIfKnown"
    let products = await getPharmacyItems(countryCode, source, versionKey, false)
    let counter = 0
    //Finding unique brands so that we don't need to match same brand twice in a product title
    let brands = getUniqueBrands(brandsMapping)
    let brandRepresentative: Record<string, string> = getBrandRepresentatives(brands, brandsMapping)
    
    for (let product of products) {
        counter++

        if (product.m_id) {
            // Already exists in the mapping table, probably no need to update
            continue
        }

        let matchedBrands = [];
        //Used to find first brand match index in a word list of a product title
        let firstMatchPosition = Number.MAX_SAFE_INTEGER
        let matchedBrand = ""
        for(let currentBrand of brands) {
            if (matchedBrands.includes(currentBrand)) {
                continue
            }
            let brandMatchPosition = getBrandMatchPosition(product.title, currentBrand)
            if(brandMatchPosition == -1) {
                continue
            }
            matchedBrands.push(currentBrand)
            //The current matched brand exists before previously matched barnds in the product-title.
            // So, update firstMatchPosition and matchedBrand
            if(brandMatchPosition < firstMatchPosition) {
                firstMatchPosition = brandMatchPosition
                matchedBrand = currentBrand
            }
        }

        const sourceId = product.source_id
        const meta = { matchedBrands }
        const brand = [Number.MAX_SAFE_INTEGER, -1].includes(firstMatchPosition)? null : brandRepresentative[matchedBrand]
        console.log(`${product.title} -> ${_.uniq(matchedBrands)}`)
        console.log(`Brand representative: ${brand}`)
        
        const key = `${source}_${countryCode}_${sourceId}`
        const uuid = stringToHash(key)

        // Then brand is inserted into product mapping table
    }
}
