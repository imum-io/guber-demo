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

function matchesWithRules(title: string, brand: string): boolean {
    const normTitle = SPECIAL_NORMALIZE(title)
    const normBrand = brand.toLowerCase()
    const words = normTitle.split(/\s+/).map(w => w.toLowerCase())

    if (IGNORE_TOKENS.includes(normBrand.toUpperCase())) {
        return false
    }

    const idx = words.indexOf(normBrand)
    if (idx === 0 && PRIORITY_FRONT.includes(normBrand.toUpperCase())) {
        return true
    }
    if ((idx === 0 || idx === 1) && SECOND_POS.includes(normBrand)) {
        return true
    }

    const isSeparate = checkBrandIsSeparateTerm(normTitle, normBrand)
    if (!isSeparate) return false

    if (PRIORITY_FRONT.includes(normBrand.toUpperCase())) {
        return idx === 0
    }
    if (normBrand === "happy") {
        return /HAPPY/.test(title)
    }

    return true
}

export async function assignBrandIfKnown(countryCode: countryCodes, source: sources, job?: Job) {
    const context = { scope: "assignBrandIfKnown" } as ContextType;

    const brandsMapping = await getBrandsMapping();
    const lists = items;

    for (const product of lists) {
        if (product.m_id) continue;
        const matched: Set<string> = new Set();
        const title = SPECIAL_NORMALIZE(product.title || "").toLowerCase();

        for (const [key, relatedList] of Object.entries(brandsMapping)) {
            for (const brand of [key, ...relatedList]) {
                if (matched.has(brand)) continue
                if (matchesWithRules(title, brand)) {
                    matched.add(brand)
                }
            }
        }

        const matchedArr = Array.from(matched)
        matchedArr.sort((a,b) => {
            const ia = title.indexOf(a)
            const ib = title.indexOf(b)
            if (ia === -1) return 1
            if (ib === -1) return -1
            return ia - ib
        })

        const final = matchedArr[0] ?? null
        console.log(`${product.title} -> ${matchedArr}`)
        product.m_id = final ? stringToHash(final) : null
        product.mappedBrand = final
    }

    return lists;
}

const SPECIAL_NORMALIZE = (input: string) => 
    input.replace(/babē/gi, "babe").trim();

const IGNORE_TOKENS = ["BIO", "NEB"]
const PRIORITY_FRONT = ["RICH","RFF","flex","ultra","gum","beauty","orto","free","112","kin","HAPPY"]
const SECOND_POS = ["heel","contour","nero","rsv"]

