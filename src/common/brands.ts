import { Job } from "bullmq";
import { countryCodes, dbServers, EngineType } from "../config/enums";
import { ContextType } from "../libs/logger";
import { replaceBabeWithTilde, stringToHash } from "../utils";
import _ from "lodash";
import { sources } from "../sites/sources";
import items from "../../data/pharmacyItems.json";
import connections from "../../data/brandConnections.json";
import brands from "../../data/brandsMapping.json";
import { promises as fs } from "fs";
import path from "path";

type BrandsMapping = {
  [key: string]: string[];
};

// Loads brand mappings by creating and normalizing brand relationships
async function loadBrandsMapping(): Promise<BrandsMapping> {
  const brandMap = createBrandMapping(connections);
  return normalizeBrandsMapping(brandMap);
}

/**
 * Creates a map of brand relationships from raw connections data.
 *
 * @param {any} connections - The raw connections data containing manufacturer mappings
 * @returns {Map<string, Set<string>>} - A map of brand names and their related brands
 */
function createBrandMapping(connections: any): Map<string, Set<string>> {
  const brandMap = new Map<string, Set<string>>();

  connections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
    const brand1 = manufacturer_p1.toLowerCase();
    const brand2Array = manufacturers_p2
      .toLowerCase()
      .split(";")
      .map((b) => b.trim());

    if (!brandMap.has(brand1)) {
      brandMap.set(brand1, new Set());
    }

    brand2Array.forEach((brand2) => {
      if (!brandMap.has(brand2)) {
        brandMap.set(brand2, new Set());
      }
      brandMap.get(brand1)!.add(brand2);
      brandMap.get(brand2)!.add(brand1);
    });
  });

  return brandMap;
}

// Task - 2
/**
 * Normalizes brand mapping and associates brand names to the canonical form.
 * The canonical name is chosen as the shortest name among related brands.
 *
 * @param {Map<string, Set<string>>} brandMap - The raw brand mapping
 * @returns {BrandsMapping} - A structured mapping of canonical brand names and their variations
 */
function normalizeBrandsMapping(
  brandMap: Map<string, Set<string>>
): BrandsMapping {
  const normalizedBrands: BrandsMapping = {};

  for (const [brand, relatedBrands] of brandMap.entries()) {
    const canonicalName = [brand, ...Array.from(relatedBrands)].reduce(
      (shortest, current) =>
        current.length < shortest.length ? current : shortest,
      brand
    );

    if (!normalizedBrands[canonicalName]) {
      normalizedBrands[canonicalName] = [];
    }

    const uniqueBrands = new Set([
      ...normalizedBrands[canonicalName],
      brand,
      ...Array.from(relatedBrands),
    ]);
    normalizedBrands[canonicalName] = Array.from(uniqueBrands);
  }
  return normalizedBrands;
}

// Fetch pharmacy items based on country and source
async function fetchPharmacyItems(
  countryCode: countryCodes,
  source: sources,
  versionKey: string,
  mustExist = true
) {
  return items; // Returned directly as no transformation is applied
}

/**
 * Checks whether a given brand is a separate term in the already-normalized input string.
 *
 * @param {string} normalizedInput - The normalized product title
 * @param {string} brand - The brand name to check
 * @returns {boolean} - True if the brand appears as a separate term, otherwise false
 */
function isBrandSeparateTerm(normalizedInput: string, brand: string): boolean {
  const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const atBeginningOrEnd = new RegExp(
    `^(?:${escapedBrand}\\s|.*\\s${escapedBrand}\\s.*|.*\\s${escapedBrand})$`,
    "i"
  ).test(normalizedInput);
  const separateTerm = new RegExp(`\\b${escapedBrand}\\b`, "i").test(
    normalizedInput
  );

  return atBeginningOrEnd || separateTerm;
}

/**
 * Assigns a brand to each product if it belongs to a known brand, then writes results to a file.
 *
 * @param {countryCodes} [countryCode] - Optional country code filter
 * @param {sources} [source] - Optional source filter
 * @param {Job} [job] - Optional BullMQ job reference
 */
export async function assignBrandIfKnown(
  countryCode?: countryCodes,
  source?: sources,
  job?: Job
) {
  console.time("assignBrandIfKnown");

  const brandsMapping = await loadBrandsMapping();
  const versionKey = "assignBrandIfKnown";
  const products = await fetchPharmacyItems(
    countryCode,
    source,
    versionKey,
    false
  );

  const outputFilePath = path.resolve(__dirname, "../../data/products.txt");

  // Remove the file before populating it
  try {
    await fs.unlink(outputFilePath);
  } catch (error) {
    console.error("File not found! File will be created now.");
  }

  for (const product of products) {
    if (product.m_id) continue;

    const matchedBrands = findMatchingBrands(product.title, brandsMapping);

    // Sort matched brands by their occurrence in the title
    if (matchedBrands.length > 1) {
      matchedBrands.sort(
        (a, b) =>
          product.title.toLowerCase().indexOf(a.toLowerCase()) -
          product.title.toLowerCase().indexOf(b.toLowerCase())
      );
    }

    // Write results to the file
    await fs.appendFile(
      outputFilePath,
      `${product.title} -> ${
        matchedBrands.length > 0 ? _.uniq(matchedBrands) : "No Brand"
      }\n`,
      "utf-8"
    );

    const sourceId = product.source_id;
    const meta = { matchedBrands };
    const brand = matchedBrands.length ? matchedBrands[0] : null;
    const key = `${source}_${countryCode}_${sourceId}`;
    const uuid = stringToHash(key);
  }

  console.timeEnd("assignBrandIfKnown");
}

// Task - 1
/**
 * Finds all matching brands for a given product title using the brands mapping.
 *
 * TODO: brands edge case logic that needs to be incorporated here:
 * 1. Babē = Babe
 * 2. Ignore BIO, NEB
 * 3. RICH, RFF, flex, ultra, gum, beauty, orto, free, 112, kin, happy has to be in the front
 * 4. heel, contour, nero, rsv in front or 2nd word
 * 5. If >1 brands matched, prioritize matching beginning
 * 6. HAPPY needs to be matched capitalized
 */
function findMatchingBrands(
  title: string,
  brandsMapping: BrandsMapping
): string[] {
  const matchedBrands: string[] = [];
  const inputNormalized = replaceBabeWithTilde(title); // Normalize title here

  for (const [canonicalBrand, relatedBrands] of Object.entries(brandsMapping)) {
    for (const brand of relatedBrands) {
      if (matchedBrands.includes(brand)) continue;

      let isBrandMatch = isBrandSeparateTerm(inputNormalized, brand);

      // Handle edge cases based on brand logic
      if (["bio", "neb"].includes(brand.toLowerCase())) continue;
      if (
        [
          "rich",
          "rff",
          "flex",
          "ultra",
          "gum",
          "beauty",
          "orto",
          "free",
          "112",
          "kin",
          "happy",
        ].includes(brand.toLowerCase())
      ) {
        isBrandMatch &&= title.toLowerCase().startsWith(brand.toLowerCase());
      }
      if (["heel", "contour", "nero", "rsv"].includes(brand.toLowerCase())) {
        const words = title.toLowerCase().split(" ");
        isBrandMatch &&=
          words[0] === brand.toLowerCase() || words[1] === brand.toLowerCase();
      }
      if (brand.toLowerCase() === "happy") {
        isBrandMatch &&= title.includes("HAPPY");
      }

      if (isBrandMatch) {
        matchedBrands.push(brand);
      }
    }
  }

  return matchedBrands;
}
