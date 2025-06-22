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

function normalizeBrandName(brand: string): string {
    // Normalize the brand name by converting to lowercase and trimming whitespace
    return brand.toLowerCase().replace(/babē/gi, "babe").trim()
}

function getCanonicalGroupMapping(): Map<string, string> {
    const brandMap = new Map<string, Set<string>>()

    for (const conn of connections) {
        const base = normalizeBrandName(conn.manufacturer_p1)
        const linked = conn.manufacturers_p2.split(";").map(b => normalizeBrandName(b))

        if (!brandMap.has(base)) brandMap.set(base, new Set())
        for (const b of linked) {
            if (!brandMap.has(b)) brandMap.set(b, new Set())
            brandMap.get(base)!.add(b)
            brandMap.get(b)!.add(base)
        }
    }

    // Union-Find style grouping
    const visited = new Set<string>()
    const canonicalMap = new Map<string, string>()

    for (const brand of brandMap.keys()) {
        if (visited.has(brand)) continue
        const group = new Set<string>()
        const stack = [brand]

        while (stack.length > 0) {
            const curr = stack.pop()!
            if (!visited.has(curr)) {
                visited.add(curr)
                group.add(curr)
                for (const neighbor of brandMap.get(curr)!) {
                    if (!visited.has(neighbor)) stack.push(neighbor)
                }
            }
        }

        const canonical = Array.from(group).sort()[0] // Pick lexically first
        for (const b of group) {
            canonicalMap.set(b, canonical)
        }
    }

    return canonicalMap
}

function isMatchRules(title: string, brand: string): boolean {
    const cleanTitle = title.replace(/babē/gi, "babe").toLowerCase()
    const brandLower = brand.toLowerCase()
    const words = cleanTitle.split(/\s+/)

    const ignoreList = ['bio', 'neb']
    const mustBeFirst = ['rich', 'rff', 'flex', 'ultra', 'gum', 'beauty', 'orto', 'free', '112', 'kin', 'happy']
    const frontOrSecond = ['heel', 'contour', 'nero', 'rsv']

    if (ignoreList.includes(brandLower)) return false
    if (mustBeFirst.includes(brandLower) && words[0] !== brandLower) return false
    if (frontOrSecond.includes(brandLower) && !(words[0] === brandLower || words[1] === brandLower)) return false
    if (brand === 'happy' && !/HAPPY/.test(title)) return false

    return new RegExp(`\\b${brandLower}\\b`, 'i').test(cleanTitle)
}

export async function assignBrandIfKnown(countryCode: countryCodes, source: sources, job?: Job) {
    const context = { scope: "assignBrandIfKnown" } as ContextType

    const canonicalBrandMap = getCanonicalGroupMapping()
    const productList = items

    for (const product of productList) {
        if (product.m_id) continue

        const title = product.title
        const matches: string[] = []

        for (const candidate of canonicalBrandMap.keys()) {
            if (isMatchRules(title, candidate)) {
                matches.push(candidate)
            }
        }

        // Prioritize brand appearing earlier in the title
        matches.sort((a, b) => {
            const aIdx = title.toLowerCase().indexOf(a.toLowerCase())
            const bIdx = title.toLowerCase().indexOf(b.toLowerCase())
            return aIdx - bIdx
        })

        const finalRaw = matches.length ? canonicalBrandMap.get(matches[0]) || matches[0] : null
        const finalBrand = finalRaw ? finalRaw.toLowerCase() : null

        if (finalBrand) {
            product.mappedBrand = finalBrand
            product.m_id = stringToHash(`${source}_${countryCode}_${product.source_id}_${finalBrand}`)
        }

        // For debugging
        console.log(`${title} => ${finalBrand} [${matches.join(", ")}]`)
    }

    return productList
}