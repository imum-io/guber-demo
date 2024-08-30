import { Job } from "bullmq"
import { countryCodes, dbServers, EngineType } from "../config/enums"
import { ContextType } from "../libs/logger"
import { jsonOrStringForDb, jsonOrStringToJson, stringOrNullForDb, stringToHash } from "../utils"
import _, { forEach } from "lodash"
import { sources } from "../sites/sources"
import items from "./../../pharmacyItems.json"
// import items from "./../../pharmacyItemsTest.json"
import connections from "./../../brandConnections.json"
import brandValidations from "./../../brandValidations.json"

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
    const validations = brandValidations;

    //Edge case validations
    if (validations.ignore.includes(brand)) {
        //TASK 3c: Ignore BIO, NEB
        return false;
    } 
    else if (validations.second_word.includes(brand)) {
        //TASK 3e: Brands that can be in the first or second word only
        input = new RegExp('^(\\S+)\\s+(\\S+)', 'u').exec(input)[0]
    } 
    else if (validations.first_word.includes(brand)) {
        //TASK 3d: Brands that can be in the first word only
        input = new RegExp('^([\\S]+)', 'u').exec(input)[0]
    }

    //Task 3g: HAPPY needs to be matched capitalized
    let flags = "ui"
    if(brand == "happy"){
        brand = brand.toUpperCase();
        flags = "u"
    }

    //Task 3b: babē = babe
    if(brand == "babe"){
        input = input.replace(new RegExp('babē', 'gi'), 'babe')
    }
    //End of validations


    // Escape any special characters in the brand name for use in a regular expression
    const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    // Check if the brand is at the beginning or end of the string
    // IMPROVEMENT: Does not seem to handle for unicode characters like švf.
    const atBeginningOrEnd = new RegExp(
        `^(?:${escapedBrand}\\s|.*\\s${escapedBrand}\\s.*|.*\\s${escapedBrand})$`,
        flags
    ).test(input)

    

    // Check if the brand is a separate term in the string
    const separateTerm = new RegExp(`\\b${escapedBrand}\\b`, flags).test(input)

    // The brand should be at the beginning, end, or a separate term
    return atBeginningOrEnd || separateTerm
}

//IMPROVEMENT: Maybe map brands once, then loop through splitted product title to perform operations, to avoid loop every brand for every product. 
export async function assignBrandIfKnown(countryCode: countryCodes, source: sources, job?: Job) {
    const context = { scope: "assignBrandIfKnown" } as ContextType

    const brandsMapping = await getBrandsMapping();
    // console.log(brandsMapping)

    const versionKey = "assignBrandIfKnown"

    const seenBrands = new Map<String, string>();
    let products = await getPharmacyItems(countryCode, source, versionKey, false)
    let counter = 0
    for (let product of products) {
        counter++

        if (product.m_id) {
            // Already exists in the mapping table, probably no need to update
            continue
        }

        // Task 2: Adds a map of seenBrands with all brands as keys and the first seen brand as value. Needs better testing.
        let matchedBrands = []
        for (const brandKey in brandsMapping) {
            let key = brandKey
            if(!seenBrands.has(brandKey)){
                seenBrands.set(brandKey, key)
            } else {
                key = seenBrands.get(brandKey)
            }
            const relatedBrands = brandsMapping[brandKey]
            for (const brand of relatedBrands) {
                if(!seenBrands.has(brand)){
                    seenBrands.set(brand, key)
                }
                if (matchedBrands.includes(brand)) {
                    continue
                }
                const isBrandMatch = checkBrandIsSeparateTerm(product.title, brand)
                if (isBrandMatch) {
                    matchedBrands.push(brand)
                }
            }
        }

        // TASK: 3f: If more than one brand found, prioritize matching beginning brand
        let assiged_brand = '';
        if(matchedBrands.length > 1){
            let lowest_index = Number.MAX_SAFE_INTEGER
            for (let brand of matchedBrands){
                let index = product.title.toLowerCase().indexOf(brand)
                if(index < lowest_index){
                    lowest_index = index
                    assiged_brand = brand
                }
            }
        } else if (matchedBrands.length > 0) {
            assiged_brand = matchedBrands[0]
        }
        assiged_brand = seenBrands.has(assiged_brand) ? seenBrands.get(assiged_brand) : assiged_brand
        console.log(`${product.title} -> ${assiged_brand}`)
        const sourceId = product.source_id
        const meta = { matchedBrands }
        const brand = matchedBrands.length ? matchedBrands[0] : null

        const key = `${source}_${countryCode}_${sourceId}`
        const uuid = stringToHash(key)

        // Then brand is inserted into product mapping table
    }
}

// assignBrandIfKnown(countryCodes['lt'], sources['APO']);
