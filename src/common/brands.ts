import { Job } from "bullmq"
import { countryCodes, dbServers, EngineType } from "../config/enums"
import { ContextType } from "../libs/logger"
import { jsonOrStringForDb, jsonOrStringToJson, stringOrNullForDb, stringToHash } from "../utils"
import _, { get } from "lodash"
import { sources } from "../sites/sources"
import items from "../dataset/pharmacyItems.json"
import connections from "../dataset/brandConnections.json"
import { BrandsGroup } from "./brandsGroup"
import { SimpleBrandEngine } from "./brandEngine"
import { normalizeBrand } from "./utils"

type BrandsMapping = {
    [key: string]: string[]
}

const brandsGroup = new BrandsGroup()
let globalBrandEngine: SimpleBrandEngine | null = null

async function initializeBrandEngine(brands: Set<string>): Promise<void> {
    if (!globalBrandEngine) {
        globalBrandEngine = new SimpleBrandEngine()
    }
    await globalBrandEngine.initialize(brands)
}

export async function getBrandsMapping(): Promise<Set<string>> {
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

    const uniqueBrands = new Set<string>()

    brandConnections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
        const brand1 = normalizeBrand(manufacturer_p1.toLowerCase())
        const brands2 = manufacturers_p2.toLowerCase()
        const brand2Array = brands2.split(";").map((b) => normalizeBrand(b.trim()))

        uniqueBrands.add(brand1)
        brandsGroup.initBrand(brand1)
        
        brand2Array.forEach((brand2) => {
            uniqueBrands.add(brand2)
            brandsGroup.initBrand(brand2)

            brandsGroup.groupBrands(brand1, brand2)
        })
    })

    return uniqueBrands
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

export async function assignBrandIfKnown(countryCode: countryCodes, source: sources, job?: Job) {
    const context = { scope: "assignBrandIfKnown" } as ContextType

    const uniqueBrands = await getBrandsMapping()

    await initializeBrandEngine(uniqueBrands)

    const versionKey = "assignBrandIfKnown"
    let products = await getPharmacyItems(countryCode, source, versionKey, false)
    let counter = 0
    for (let product of products) {
        counter++

        if (product.m_id) {
            // Already exists in the mapping table, probably no need to update
            continue
        }

        const prioritizedBrands: string[] = globalBrandEngine.getAllMatches(product.title)
        const canonicalBrand = prioritizedBrands[0] ? brandsGroup.findBrandParent(prioritizedBrands[0]) : ""

        console.log(`Product Title: ${product.title}, Matched Brands: ${prioritizedBrands}, Canonical Brand: ${canonicalBrand}`)
        const sourceId = product.source_id
        const meta = { matchedBrands: prioritizedBrands }
        const brand = canonicalBrand

        const key = `${source}_${countryCode}_${sourceId}`
        const uuid = stringToHash(key)

        // Then brand is inserted into product mapping table
    }
}
