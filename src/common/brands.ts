import { countryCodes } from "../config/enums";
import _ from "lodash";
import { sources } from "../sites/sources";
import items from "./../../pharmacyItems.json";
import connections from "./../../brandConnections.json";
import brandsMappingRaw from "./../../brandsMapping.json";
import fs from 'fs';
import path from 'path';
import stringSimilarity from 'string-similarity';

type BrandsMapping = {
    [key: string]: string[];
}

type ProcessStats = {
    total: number;
    matched: number;
    skipped: number;
    errors: number;
};

// Add statistics tracking
let stats: ProcessStats = {
    total: 0,
    matched: 0,
    skipped: 0,
    errors: 0
};

// Error handling wrapper
function tryOrLog<T>(fn: () => T, context: string): T | null {
    try {
        return fn();
    } catch (error) {
        console.error(`Error in ${context}:`, error);
        stats.errors++;
        return null;
    }
}

// Helper for error logging
function logError(context: string, error: any) {
    console.error(`Error in ${context}:`, error);
    stats.errors++;
}

// Helper to write results to a file
async function writeResults(results: any[], filename: string) {
    try {
        const outputPath = path.join(process.cwd(), filename);
        await fs.promises.writeFile(outputPath, JSON.stringify(results, null, 2));
        console.log(`Results written to ${outputPath}`);
    } catch (error) {
        logError('writeResults', error);
    }
}

// Main entry point for CLI
async function main() {
    console.log('Starting brand matching process...');
    
    try {
        // Reset statistics
        stats = { total: 0, matched: 0, skipped: 0, errors: 0 };
        
        // Process brand matches
        const results = await assignBrandIfKnown(countryCodes.DE, sources.pharmacy);
        
        // Write results
        await writeResults(results, 'brand-matching-results.json');
        
        // Generate and write analysis report
        const analysis = analyzeResults(results);
        await writeAnalysisReport(analysis);
        
        // Print statistics
        console.log('\nProcessing complete. Statistics:');
        console.log(`Total items processed: ${stats.total}`);
        console.log(`Successfully matched: ${stats.matched}`);
        console.log(`Skipped items: ${stats.skipped}`);
        console.log(`Errors encountered: ${stats.errors}`);
        
        console.log('\nMatch Pattern Distribution:');
        Object.entries(analysis.matchPatterns).forEach(([pattern, count]) => {
            console.log(`${pattern}: ${count} items`);
        });
        
        console.log('\nCheck brand-analysis-report.txt for detailed analysis');
        
    } catch (error) {
        console.error('Fatal error in main process:', error);
        process.exit(1);
    }
}

// Run main if this file is being run directly
if (require.main === module) {
    main().catch(console.error);
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

// Helper to get canonical brand for any synonym
function getCanonicalBrand(brand: string, brandsMapping: Record<string, string[]>): string {
    // Lowercase for matching
    const lowerBrand = brand.toLowerCase();
    for (const [canonical, synonyms] of Object.entries(brandsMapping)) {
        if (synonyms.map(b => b.toLowerCase()).includes(lowerBrand)) {
            return canonical;
        }
    }
    return brand; // fallback to itself
}

// Fuzzy matching configuration
const SIMILARITY_THRESHOLD = 0.85;
const MIN_BRAND_LENGTH = 3;

function getFuzzyMatches(title: string, brand: string): { matched: boolean; similarity: number } {
    // Don't do fuzzy matching for very short brands to avoid false positives
    if (brand.length < MIN_BRAND_LENGTH) {
        return { matched: false, similarity: 0 };
    }

    // Get words from the title
    const words = title.toLowerCase().split(/\s+/);
    
    // Check each word against the brand
    let maxSimilarity = 0;
    for (const word of words) {
        if (word.length >= MIN_BRAND_LENGTH) {
            const similarity = stringSimilarity.compareTwoStrings(
                word.toLowerCase(),
                brand.toLowerCase()
            );
            maxSimilarity = Math.max(maxSimilarity, similarity);
        }
    }

    return {
        matched: maxSimilarity >= SIMILARITY_THRESHOLD,
        similarity: maxSimilarity
    };
}

// Helper for edge case brand matching
export function isBrandMatchEdgeCase(title: string, brand: string): boolean {
    const normalizedTitle = title.trim();
    const normalizedBrand = brand.trim().toLowerCase();
    const titleWords = normalizedTitle.toLowerCase().split(/\s+/);

    // 1. Babē = Babe
    if (["babē", "babe"].includes(normalizedBrand)) {
        return /\bbab[ēe]\b/i.test(normalizedTitle);
    }

    // 2. Ignore BIO, NEB
    if (["bio", "neb"].includes(normalizedBrand)) {
        return false;
    }

    // 3. Must be in the front: RICH, RFF, flex, ultra, gum, beauty, orto, free, 112, kin, happy
    const frontBrands = ["rich", "rff", "flex", "ultra", "gum", "beauty", "orto", "free", "112", "kin", "happy"];
    if (frontBrands.includes(normalizedBrand)) {
        // Special: HAPPY must be capitalized
        if (normalizedBrand === "happy") {
            return normalizedTitle.startsWith("HAPPY ");
        }
        return titleWords[0].toLowerCase() === normalizedBrand;
    }

    // 4. heel, contour, nero, rsv - must be in front or second word
    const frontOrSecondBrands = ["heel", "contour", "nero", "rsv"];
    if (frontOrSecondBrands.includes(normalizedBrand)) {
        return titleWords[0] === normalizedBrand || (titleWords.length > 1 && titleWords[1] === normalizedBrand);
    }

    // 5. For all other cases, use original separate term logic
    const fuzzyResult = getFuzzyMatches(normalizedTitle, normalizedBrand);
    if (fuzzyResult.matched) {
        return true;
    }

    return checkBrandIsSeparateTerm(normalizedTitle, brand);
}

// Helper to get canonical brand for group
export function getCanonicalBrandForGroup(brands: string[], brandsMapping: Record<string, string[]>): string {
    // Create a set of all possible canonical brands
    const canonicalBrands = new Set<string>();
    
    for (const brand of brands) {
        // First try to find if this brand is a canonical brand itself
        if (brandsMapping[brand]) {
            canonicalBrands.add(brand);
            continue;
        }
        
        // Then look for it in other brand's synonyms
        for (const [canonical, synonyms] of Object.entries(brandsMapping)) {
            if (synonyms.map(b => b.toLowerCase()).includes(brand.toLowerCase())) {
                canonicalBrands.add(canonical);
                break;
            }
        }
    }
    
    // Convert to array and sort for consistent selection
    const sortedCanonicals = Array.from(canonicalBrands).sort();
    // Always select the first one (alphabetically) to ensure consistency
    return sortedCanonicals[0] || null;
}

// Helper to normalize brand names
function normalizeBrand(brand: string): string {
    return brand.trim().toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9]/g, ''); // Remove special characters
}

// Helper to check brand similarity
function areBrandsSimilar(brand1: string, brand2: string): boolean {
    return normalizeBrand(brand1) === normalizeBrand(brand2);
}

interface BrandMatchResult {
    uuid: string;
    key: string;
    title: string;
    assignedBrand: string | null;
    matchedBrands: string[];
    confidence: number;
}

export async function assignBrandIfKnown(
    countryCode: countryCodes, 
    source: sources
): Promise<BrandMatchResult[]> {
    console.log('Starting brand assignment process...');
    const results: BrandMatchResult[] = []; // Initialize results array

    // Validate inputs
    if (!Object.values(countryCodes).includes(countryCode)) {
        throw new Error(`Invalid country code: ${countryCode}`);
    }
    if (!Object.values(sources).includes(source)) {
        throw new Error(`Invalid source: ${source}`);
    }

    try {
        // Use brandsMapping.json for canonical assignment
        const brandsMapping: Record<string, string[]> = brandsMappingRaw;
        
        // Create a cache for brand group assignments
        const brandGroupAssignments = new Map<string, string>();

        const versionKey = "assignBrandIfKnown";
        let products = await getPharmacyItems(countryCode, source, versionKey, false);
        
        // Process each product
        for (let product of products) {
            stats.total++;
            
            try {
                if (product.m_id) {
                    stats.skipped++;
                    continue;
                }
                
                let matchedBrands: string[] = [];
                
                // Find matching brands with error handling
                const matches = tryOrLog(() => {
                    let matches: string[] = [];
                    for (const canonical in brandsMapping) {
                        const relatedBrands = brandsMapping[canonical];
                        for (const brand of relatedBrands) {
                            if (!matches.includes(brand) && isBrandMatchEdgeCase(product.title, brand)) {
                                matches.push(brand);
                            }
                        }
                    }
                    return matches;
                }, 'brand matching');

                if (matches) {
                    matchedBrands = matches;
                }
                
                // Process matches if any found
                let assignedBrand = null;
                if (matchedBrands.length > 0) {
                    // Prioritize matches at the beginning
                    if (matchedBrands.length > 1) {
                        tryOrLog(() => {
                            matchedBrands.sort((a, b) => {
                                const aIdx = product.title.toLowerCase().indexOf(a.toLowerCase());
                                const bIdx = product.title.toLowerCase().indexOf(b.toLowerCase());
                                return aIdx - bIdx;
                            });
                            
                            // Keep only the matches from the start
                            const firstMatchIndex = product.title.toLowerCase().indexOf(matchedBrands[0].toLowerCase());
                            matchedBrands = matchedBrands.filter(brand => {
                                const idx = product.title.toLowerCase().indexOf(brand.toLowerCase());
                                return idx === firstMatchIndex;
                            });
                        }, 'brand prioritization');
                    }
                    
                    // Get canonical brand for the group
                    const groupKey = matchedBrands.sort().join('|');
                    if (brandGroupAssignments.has(groupKey)) {
                        assignedBrand = brandGroupAssignments.get(groupKey);
                    } else {
                        assignedBrand = getCanonicalBrandForGroup(matchedBrands, brandsMapping);
                        if (assignedBrand) {
                            brandGroupAssignments.set(groupKey, assignedBrand);
                        }
                    }
                    
                    if (assignedBrand) {
                        stats.matched++;
                    }
                }

                // Prepare result
                const sourceId = product.source_id;
                const meta = { matchedBrands };
                const key = `${source}_${countryCode}_${sourceId}`;
                const uuid = stringToHash(key);

                results.push({
                    uuid,
                    key,
                    title: product.title,
                    assignedBrand,
                    matchedBrands,
                    confidence: matchedBrands.length === 1 ? 1 : matchedBrands.length > 1 ? 0.8 : 0
                });

            } catch (error) {
                logError(`Processing product ${product.source_id}`, error);
            }
        }
        
    } catch (error) {
        logError('assignBrandIfKnown', error);
        throw error; // Re-throw to be handled by caller
    }

    return results;
}

interface AnalysisReport {
    matchedBrands: { [key: string]: number };
    unmatchedItems: Array<{ title: string; potentialBrands: string[] }>;
    confidenceDistribution: { [key: string]: number };
    commonPrefixes: { [key: string]: number };
    matchPatterns: { [key: string]: number };
}

function analyzeResults(results: BrandMatchResult[]): AnalysisReport {
    const report: AnalysisReport = {
        matchedBrands: {},
        unmatchedItems: [],
        confidenceDistribution: {},
        commonPrefixes: {},
        matchPatterns: {}
    };

    for (const result of results) {
        // Analyze matched brands frequency
        if (result.assignedBrand) {
            report.matchedBrands[result.assignedBrand] = (report.matchedBrands[result.assignedBrand] || 0) + 1;
        }

        // Analyze unmatched items
        if (!result.assignedBrand) {
            // Get first word as potential brand
            const words = result.title.split(/\s+/);
            const firstWord = words[0].replace(/[^\w]/g, '').toLowerCase();
            const secondWord = words[1]?.replace(/[^\w]/g, '').toLowerCase();
            
            report.unmatchedItems.push({
                title: result.title,
                potentialBrands: [firstWord, secondWord].filter(Boolean)
            });

            // Track common prefixes of unmatched items
            if (firstWord.length > 2) {
                report.commonPrefixes[firstWord] = (report.commonPrefixes[firstWord] || 0) + 1;
            }
        }

        // Analyze confidence distribution
        const confidenceKey = result.confidence.toString();
        report.confidenceDistribution[confidenceKey] = (report.confidenceDistribution[confidenceKey] || 0) + 1;

        // Analyze match patterns
        const pattern = result.matchedBrands.length > 0 ? 
            (result.title.toLowerCase().startsWith(result.matchedBrands[0].toLowerCase()) ? 'prefix' : 'contains') :
            'no_match';
        report.matchPatterns[pattern] = (report.matchPatterns[pattern] || 0) + 1;
    }

    return report;
}

async function writeAnalysisReport(report: AnalysisReport) {
    // Sort and filter the data for better readability
    const sortedBrands = Object.entries(report.matchedBrands)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20); // Top 20 most frequent brands

    const sortedPrefixes = Object.entries(report.commonPrefixes)
        .sort(([, a], [, b]) => b - a)
        .filter(([, count]) => count > 5) // Only prefixes that appear more than 5 times
        .slice(0, 30); // Top 30 most common prefixes

    // Prepare the report text
    const reportText = `Brand Matching Analysis Report
===============================

Match Statistics
---------------
${Object.entries(report.matchPatterns)
    .map(([pattern, count]) => `${pattern}: ${count} items`)
    .join('\n')}

Confidence Distribution
---------------------
${Object.entries(report.confidenceDistribution)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([confidence, count]) => `Confidence ${confidence}: ${count} items`)
    .join('\n')}

Top 20 Most Frequent Brands
-------------------------
${sortedBrands.map(([brand, count]) => `${brand}: ${count} matches`).join('\n')}

Top 30 Common Unmatched Prefixes
-----------------------------
${sortedPrefixes.map(([prefix, count]) => `${prefix}: ${count} occurrences`).join('\n')}

Potential New Brand Suggestions
---------------------------
${sortedPrefixes
    .filter(([prefix]) => !Object.keys(report.matchedBrands).includes(prefix))
    .slice(0, 10)
    .map(([prefix, count]) => `${prefix}: ${count} occurrences`)
    .join('\n')}
`;

    await fs.promises.writeFile('brand-analysis-report.txt', reportText);
    console.log('Analysis report written to brand-analysis-report.txt');
}

// Simple hash function for generating UUIDs
function stringToHash(str: string): string {
    let hash = 5381;
    let i = str.length;

    while (i) {
        hash = (hash * 33) ^ str.charCodeAt(--i);
    }

    // Convert to a positive 32-bit integer and then to hex string
    const hex = (hash >>> 0).toString(16);
    
    // Format as UUID-like string
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        '4' + hex.slice(12, 15), // Version 4 UUID
        '8' + hex.slice(15, 18), // Variant 1 UUID
        hex.slice(18, 30)
    ].join('-');
}
