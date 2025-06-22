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

type CanonicalMap = { [brand: string]: string }

export function buildCanonicalMap(connections: any[]): CanonicalMap {
    const parent = new Map<string, string>()

    const find = (b: string): string => {
        if (!parent.has(b)) parent.set(b, b)
        if (parent.get(b) !== b) parent.set(b, find(parent.get(b)!))
        return parent.get(b)!
    }

    const union = (a: string, b: string) => {
        const pa = find(a)
        const pb = find(b)
        if (pa !== pb) parent.set(pa, pb)
    }

    for (const { manufacturer_p1, manufacturers_p2 } of connections) {
        const a = manufacturer_p1.toLowerCase()
        for (const b of manufacturers_p2.toLowerCase().split(";").map(x => x.trim())) {
            union(a, b)
        }
    }

    const groups = new Map<string, Set<string>>()
    for (const brand of parent.keys()) {
        const root = find(brand)
        if (!groups.has(root)) groups.set(root, new Set())
        groups.get(root)!.add(brand)
    }

    const canonicalMap: CanonicalMap = {}
    for (const group of groups.values()) {
        const sorted = Array.from(group).sort()
        const canonical = sorted[0]
        for (const brand of group) {
            canonicalMap[brand] = canonical
        }
    }

    return canonicalMap
}

const blacklist = ["bio", "neb"]
const prefixOnly = ["rich", "rff", "flex", "ultra", "gum", "beauty", "orto", "free", "112", "kin", "happy"]
const prefixOrSecond = ["heel", "contour", "nero", "rsv"]
const exactCase = ["happy"]

function matchBrandsWithRules(title: string, canonicalMap: CanonicalMap): string[] {
    const lowerTitle = title.toLowerCase()
    const titleWords = lowerTitle.split(/\s+/)
    const matched: { brand: string, pos: number }[] = []

    const uniqueBrands = Object.keys(canonicalMap)

    for (const brand of uniqueBrands) {
        const brandLower = brand.toLowerCase()
        const brandUpper = brand.toUpperCase()

        if (blacklist.includes(brandLower)) continue

        const regex = new RegExp(`\\b${_.escapeRegExp(brand)}\\b`, "i")
        if (!regex.test(title)) continue

        const pos = titleWords.indexOf(brandLower)

        if (exactCase.includes(brandUpper) && !title.includes(brandUpper)) continue
        if (prefixOnly.includes(brandLower) && pos !== 0) continue
        if (prefixOrSecond.includes(brandLower) && pos > 1) continue

        matched.push({ brand: canonicalMap[brandLower], pos })
    }

    const uniq = _.uniqBy(matched, 'brand')
    return _.sortBy(uniq, 'pos').map((b) => b.brand)
}

export async function assignBrandIfKnown(countryCode: countryCodes, source: sources, job?: Job) {
    const context = { scope: "assignBrandIfKnown" } as ContextType

    const canonicalMap = buildCanonicalMap(connections)
    const versionKey = "assignBrandIfKnown"
    const products = await getPharmacyItems(countryCode, source, versionKey, false)

    let counter = 0
    for (const product of products) {
        counter++
        if (product.m_id) continue

        const matchedBrands = matchBrandsWithRules(product.title, canonicalMap)
        const canonicalBrand = matchedBrands.length ? matchedBrands[0] : null

        const sourceId = product.source_id
        const key = `${source}_${countryCode}_${sourceId}`
        const uuid = stringToHash(key)

        console.log(`[${counter}] ${product.title} -> ${matchedBrands.join(", ")} | Assigned: ${canonicalBrand}`)
    }
}
