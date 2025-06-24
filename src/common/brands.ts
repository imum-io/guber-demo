import { Job } from "bullmq"
import { countryCodes, dbServers, EngineType } from "../config/enums"
import { ignoreBrands, frontOnlyBrands, frontOrSecondWordBrands, canonicalBrandMap } from "../config/variables"
import { ContextType } from "../libs/logger"
import { jsonOrStringForDb, jsonOrStringToJson, stringOrNullForDb, stringToHash } from "../utils"
import _ from "lodash"
import { sources } from "../sites/sources"
import items from "./../../pharmacyItems.json"
import connections from "./../../brandConnections.json"

type BrandsMapping = {
    [key: string]: string[]
}

/**
 * Normalize brand names (accent removal and aliases)
 */
function normalizeBrand(brand: string): string {
  // Handle Babē alias to Babe
  if (brand.toLowerCase() === "babē") return "babe"
  return brand.toLowerCase()
}

/**
 * Check if a brand matches at valid positions in title words according to the rules
 */
function isBrandMatchAtPosition(titleWords: string[], brand: string): boolean {
  const brandLower = brand.toLowerCase()

  // Rule 6: HAPPY must be matched capitalized only
  if (brand.toUpperCase() === "HAPPY" && !titleWords.includes("HAPPY")) {
    return false
  }

  // Rule 2: Ignore brands: BIO, NEB
  if (ignoreBrands.has(brandLower)) {
    return false
  }

  // Rule 3: front-only brands
  if (frontOnlyBrands.has(brandLower)) {
    return titleWords[0]?.toLowerCase() === brandLower
  }

  // Rule 4: front or second word brands
  if (frontOrSecondWordBrands.has(brandLower)) {
    return (
      titleWords[0]?.toLowerCase() === brandLower ||
      titleWords[1]?.toLowerCase() === brandLower
    )
  }

  // Default: brand exists anywhere as separate word
  return titleWords.some(word => word.toLowerCase() === brandLower)
}

/**
 * Task 1:
 * Match brands in product title according to rules, prioritizing front matches
 * Returns ordered list of matched brands (prioritized)
 */
export function matchBrandsInTitle(title: string, brands: string[]): string[] {
  // Remove punctuation and normalize spacing
  const normalizedTitle = title.trim().replace(/[^\w\s]/g, " ")
  const titleWords = normalizedTitle.split(/\s+/)

  // Normalize brands for matching with alias support
  const normalizedBrands = brands.map(normalizeBrand)

  const matchedBrands: { brand: string; atBeginning: boolean }[] = []

  for (let i = 0; i < brands.length; i++) {
    const originalBrand = brands[i]
    const normalizedBrand = normalizedBrands[i]

    if (!isBrandMatchAtPosition(titleWords, originalBrand)) continue

    const atBeginning = titleWords[0]?.toLowerCase() === normalizedBrand
    matchedBrands.push({ brand: originalBrand, atBeginning })
  }

  // Sort so brands matched at beginning come first
  matchedBrands.sort((a, b) =>
    a.atBeginning === b.atBeginning ? 0 : a.atBeginning ? -1 : 1
  )

  // Remove duplicates while preserving order
  return [...new Set(matchedBrands.map(m => m.brand))]
}

/**
 * Task 2:
 * Return canonical brand for the given brand according to group mapping
 */
export function getCanonicalBrand(brand: string): string {
  const lower = brand.toLowerCase()
  return canonicalBrandMap[lower] || brand
}

/**
 * Fetch brand mapping from connections.json (mock DB)
 * Builds a bidirectional mapping of brand groups
 */
export async function getBrandsMapping(): Promise<BrandsMapping> {
  const brandConnections = connections

  const brandMap = new Map<string, Set<string>>()

  brandConnections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
    const brand1 = manufacturer_p1.toLowerCase()
    const brands2 = manufacturers_p2.toLowerCase()
    const brand2Array = brands2.split(";").map(b => b.trim())

    if (!brandMap.has(brand1)) brandMap.set(brand1, new Set())
    brand2Array.forEach(brand2 => {
      if (!brandMap.has(brand2)) brandMap.set(brand2, new Set())
      brandMap.get(brand1)!.add(brand2)
      brandMap.get(brand2)!.add(brand1)
    })
  })

  // Convert map to plain object with arrays
  const flatMapObject: Record<string, string[]> = {}
  brandMap.forEach((relatedBrands, brand) => {
    flatMapObject[brand] = Array.from(relatedBrands)
  })

  return flatMapObject
}

/**
 * Mock fetch pharmacy items from JSON file (mock DB)
 */
async function getPharmacyItems(
  countryCode: countryCodes,
  source: sources,
  versionKey: string,
  mustExist = true
) {
  return items
}

/**
 * Main Task 1 & 2:
 * Assign brand for products, ensuring unified canonical brand per group
 */
export async function assignBrandIfKnown(
  countryCode: countryCodes,
  source: sources,
  job?: Job
) {
  const context = { scope: "assignBrandIfKnown" } as ContextType

  const brandsMapping = await getBrandsMapping()
  const versionKey = "assignBrandIfKnown"
  const products = await getPharmacyItems(countryCode, source, versionKey, false)

  for (const product of products) {
    if (product.m_id) continue // Already assigned

    // All brand keys from mapping
    const allBrands = Object.keys(brandsMapping)

    // Task 1: Match brands using rules and prioritization
    let matchedBrands = matchBrandsInTitle(product.title, allBrands)

    if (matchedBrands.length === 0) continue

    // Task 2: Get canonical brand for group unification
    const canonicalBrand = getCanonicalBrand(matchedBrands[0])

    // Debug logging
    console.log(`${product.title} -> Matched brands: ${matchedBrands}`)
    console.log(`Assigning canonical brand: ${canonicalBrand}`)

    // TODO: Insert/update product brand mapping in DB here with canonicalBrand
    // Ensure entire group uses canonicalBrand to avoid duplicates

    // Example: Generate UUID key for mapping (if needed)
    const sourceId = product.source_id || product.sourceId
    if (!sourceId) continue

    const key = `${source}_${countryCode}_${sourceId}`
    const uuid = stringToHash(key)

    // Potential DB save/update logic here
  }
}
