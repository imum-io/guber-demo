import { Job } from "bullmq"
import { countryCodes } from "../config/enums"
import * as fs from 'fs'
import * as path from 'path'
import _ from "lodash"
import { sources } from "../sites/sources"
import items from "../../pharmacyItems.json"
import connections from "../../brandConnections.json"

type BrandsMapping = {
    [key: string]: string[]
}

type ProductBrandMapping = {
    sourceId: string,
    title: string,
    brand: string | null
}[]

const SPECIAL_BRAND_RULES = {
    IGNORE_BRANDS: ['BIO', 'NEB'],
    FRONT_PRIORITY_BRANDS: ['RICH', 'RFF', 'flex', 'ultra', 'gum', 'beauty', 'orto', 'free', '112', 'kin', 'HAPPY'],
    FRONT_OR_SECOND_BRANDS: ['heel', 'contour', 'nero', 'rsv']
}

function normalizeSpecialCases(brand: string): string {
    if (brand === 'Babē') return 'Babe'
    return brand
}

export async function getBrandsMapping(): Promise<BrandsMapping> {
    const brandMap = new Map<string, Set<string>>()

    connections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
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

    //Consolidate brand groups to have a single representative brand
    const consolidatedGroups = new Map<string, Set<string>>()
    const processedBrands = new Set<string>()

    // Group related brands together
    for (const [brand, relatedBrands] of brandMap.entries()) {
        if (processedBrands.has(brand)) continue

        const group = new Set<string>([brand])
        const queue = [...relatedBrands]

        // Breadth-first traversal to find all related brands
        while (queue.length > 0) {
            const currentBrand = queue.pop()!
            if (!processedBrands.has(currentBrand)) {
                group.add(currentBrand)
                processedBrands.add(currentBrand)
                
                // Add any new related brands to the queue
                for (const related of (brandMap.get(currentBrand) || [])) {
                    if (!group.has(related) && !processedBrands.has(related)) {
                        queue.push(related)
                    }
                }
            }
        }

        // Choose the "primary" brand (first alphabetically)
        const primaryBrand = Array.from(group).sort()[0]
        consolidatedGroups.set(primaryBrand, group)
    }

    const flatMapObject: Record<string, string[]> = {}
    for (const [primaryBrand, group] of consolidatedGroups.entries()) {
        flatMapObject[primaryBrand] = Array.from(group)
    }

    return flatMapObject
}

function prioritizeBrandMatching(title: string, matchedBrands: string[]): string | null {
    // Normalize brands (e.g., handle Babē case)
    const normalizedBrands = matchedBrands.map(b => normalizeSpecialCases(b));

    // Filter out ignored brands
    const filteredBrands = normalizedBrands.filter(
        brand => !SPECIAL_BRAND_RULES.IGNORE_BRANDS.includes(brand)
    );

    if (filteredBrands.length === 0) return null;
    if (filteredBrands.length === 1) return filteredBrands[0];

    // Prioritize brands in specific positions
    const frontPriorityMatch = filteredBrands.find(brand => 
        SPECIAL_BRAND_RULES.FRONT_PRIORITY_BRANDS.includes(brand) || 
        new RegExp(`^${brand}\\b|^\\w+\\s+${brand}\\b`, 'i').test(title)
    );

    if (frontPriorityMatch) return frontPriorityMatch;

    // Check for brands allowed at front or second position
    const frontOrSecondMatch = filteredBrands.find(brand => 
        SPECIAL_BRAND_RULES.FRONT_OR_SECOND_BRANDS.includes(brand) || 
        new RegExp(`^${brand}\\b|^\\w+\\s+${brand}\\b`, 'i').test(title)
    );

    if (frontOrSecondMatch) return frontOrSecondMatch;

    //match at the beginning or first matched brand
    const beginningMatch = filteredBrands.find(brand => 
        new RegExp(`^${brand}\\b`, 'i').test(title)
    );

    return beginningMatch || filteredBrands[0];
}

export async function assignBrandIfKnown(countryCode: countryCodes, source: sources, job?: Job) {
    const brandsMapping = await getBrandsMapping()
    const versionKey = "assignBrandIfKnown"
    let products = await getPharmacyItems(countryCode, source, versionKey, false)
    
    // Container for brand mappings
    const productBrandMappings: ProductBrandMapping = []

    for (let product of products) {
        if (product.m_id) continue

        let matchedBrands = []
        for (const brandKey in brandsMapping) {
            const relatedBrands = brandsMapping[brandKey]
            for (const brand of relatedBrands) {
                if (matchedBrands.includes(brand)) continue
                
                // Check if brand is a separate term in the title
                const isBrandMatch = checkBrandIsSeparateTerm(product.title, brand)
                if (isBrandMatch) {
                    matchedBrands.push(brand)
                }
            }
        }

        // Apply brand matching rules
        const finalBrand = prioritizeBrandMatching(product.title, matchedBrands)
        
        //store mapping
        productBrandMappings.push({
            sourceId: product.source_id,
            title: product.title,
            brand: finalBrand
        })
    }

    // Export to JSON file
    const outputDir = path.resolve(__dirname, '..', '..', 'output')
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir)
    }
    
    const outputFile = path.join(outputDir, `brand_mapping_${source}_${countryCode}.json`)
    fs.writeFileSync(outputFile, JSON.stringify(productBrandMappings, null, 2))
    
    console.log(`Brand mappings exported to ${outputFile}`)
    return productBrandMappings
}

export function checkBrandIsSeparateTerm(input: string, brand: string): boolean {
    const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    const atBeginningOrEnd = new RegExp(
        `^(?:${escapedBrand}\\s|.*\\s${escapedBrand}\\s.*|.*\\s${escapedBrand})$`,
        "i"
    ).test(input)

    const separateTerm = new RegExp(`\\b${escapedBrand}\\b`, "i").test(input)

    return atBeginningOrEnd || separateTerm
}

async function getPharmacyItems(countryCode: countryCodes, source: sources, versionKey: string, mustExist = true) {
    return items
}