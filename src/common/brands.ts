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
    const brandConnections = connections

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

    // Convert the flat map to an object for easier usage
    const flatMapObject: Record<string, string[]> = {}

    brandMap.forEach((relatedBrands, brand) => {
        flatMapObject[brand] = Array.from(relatedBrands)
    })

    return flatMapObject
}

async function getPharmacyItems(countryCode: countryCodes, source: sources, versionKey: string, mustExist = true) {
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

    // 1st task to add some validations -> Brands edge case logics
    // Brands edge case setup
    const ignoredWords = ["bio", "neb"]
    const mustBeFront = ["rich", "rff", "flex", "ultra", "gum", "beauty", "orto", "free", "112", "kin", "happy"]
    const mustBeFrontOrSecond = ["heel", "contour", "nero", "rsv"]

    // Brands edge case logic 1: Babē = Babe
    function normalizeText(text: string): string {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    }

    // Brands edge case logic 2: ignore BIO, NEB; BIO → bio, NEB → neb, and then removed    
    function getWordsWithoutIgnored(text: string): string[] {
        return text.split(/\s+/).map(w => normalizeText(w)).filter(w => !ignoredWords.includes(w))
    }

    for (let product of products) {
        counter++

        if (product.m_id) {
            // Already exists in the mapping table, probably no need to update
            continue
        }

        const title = product.title || ""
        const normalizedTitle = normalizeText(title)
        const words = getWordsWithoutIgnored(normalizedTitle)
        let matchedBrands = []
        for (const brandKey in brandsMapping) {
            const relatedBrands = brandsMapping[brandKey]
            for (const brand of relatedBrands) {
                const brandNorm = normalizeText(brand)
                if (ignoredWords.includes(brandNorm)) {
                    continue
                }
                if (matchedBrands.includes(brandNorm)) {
                    continue
                }
                const isBrandMatch = checkBrandIsSeparateTerm(normalizedTitle, brandNorm)
                if (isBrandMatch) {
                    // Brands edge case logic 3: RICH, RFF, flex, ultra, gum, beauty, orto, free, 112, kin, happy has to be in the front
                    if (mustBeFront.includes(brandNorm) && words[0] !== brandNorm) {
                        continue
                    }

                    // Brands edge case logic 4:  heel, contour, nero, rsv in front or 2nd word
                    if (mustBeFrontOrSecond.includes(brandNorm) && words[0] !== brandNorm && words[1] !== brandNorm) {
                        continue
                    }

                    // Brands edge case logic 6: HAPPY needs to be matched capitalized
                    if (brandNorm === "happy" && !title.includes("HAPPY")) {
                        continue
                    }
                    matchedBrands.push(brandNorm)
                }
            }
        }

        // Brands edge case logic 5:  if >1 brands matched, prioritize matching beginning
        matchedBrands.sort((a, b) => {
            return normalizedTitle.indexOf(a) - normalizedTitle.indexOf(b)
        })

        // 2nd task - to always assign the same brand for whole group
        const brand = matchedBrands.length ? matchedBrands[0] : null
        const consistentBrand = brand ? (brandsMapping[brand.toLowerCase()] || [brand]).sort()[0] : null

        console.log(`${product.title} -> ${_.uniq(matchedBrands)} => ${consistentBrand}`)
        const sourceId = product.source_id
        const meta = { matchedBrands }
        //const brand = matchedBrands.length ? matchedBrands[0] : null

        const key = `${source}_${countryCode}_${sourceId}`
        const uuid = stringToHash(key)

        // Then brand is inserted into product mapping table
    }
}
