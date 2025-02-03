import { Job } from "bullmq";
import { countryCodes, dbServers, EngineType } from "../config/enums";
import { ContextType } from "../libs/logger";
import { jsonOrStringToJson, stringToHash } from "../utils";
import _ from "lodash";
import { sources } from "../sites/sources";
import items from "./../../pharmacyItems.json";
import connections from "./../../brandConnections.json";

type BrandsMapping = Record<string, string[]>;

// **Validation Rules**
const IGNORED_WORDS = ["BIO", "NEB"];
const PRIORITY_WORDS = ["RICH", "RFF", "flex"];
const POSITION_SPECIFIC_WORDS = ["heel", "contour"];

// Function to check if the brand exists as a separate word in the title
export function checkBrandIsSeparateTerm(
  input: string,
  brand: string
): boolean {
  if (!input || !brand) return false;

  // Normalize case
  const normalizedInput = input.toLowerCase();
  const normalizedBrand = brand.toLowerCase();

  // Ignore certain words
  if (IGNORED_WORDS.includes(normalizedBrand.toUpperCase())) return false;

  // Escape special characters in brand name
  const escapedBrand = normalizedBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Create regex for whole-word match
  const brandRegex = new RegExp(`\\b${escapedBrand}\\b`, "i");

  // Check if the brand matches at the beginning or as a priority word
  if (PRIORITY_WORDS.includes(normalizedBrand.toUpperCase())) {
    return normalizedInput.startsWith(normalizedBrand);
  }

  // Check if the brand matches position-specific words
  if (POSITION_SPECIFIC_WORDS.includes(normalizedBrand)) {
    const words = normalizedInput.split(" ");
    return words[0] === normalizedBrand || words[1] === normalizedBrand;
  }

  // Default match
  return brandRegex.test(normalizedInput);
}

// Function to get the brand mapping
export async function getBrandsMapping(): Promise<BrandsMapping> {
  const brandConnections = connections; // Use static JSON for now

  // Create a graph-based mapping
  const brandMap = new Map<string, Set<string>>();
  brandConnections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
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

  // Flatten the graph into an object
  const flatMapObject: Record<string, string[]> = {};
  brandMap.forEach((relatedBrands, brand) => {
    flatMapObject[brand] = Array.from(relatedBrands);
  });

  return flatMapObject;
}

// Fetch pharmacy items
async function getPharmacyItems(
  countryCode: countryCodes,
  source: sources,
  versionKey: string,
  mustExist = true
) {
  const finalProducts = items; // Use static JSON for now
  return finalProducts;
}

// **Main Function** - Assign brand if known
export async function assignBrandIfKnown(
  countryCode: countryCodes,
  source: sources,
  job?: Job
) {
  const context = { scope: "assignBrandIfKnown" } as ContextType;
  console.log("Fetching brand mappings...");
  const brandsMapping = await getBrandsMapping();
  const versionKey = "assignBrandIfKnown";
  let products = await getPharmacyItems(countryCode, source, versionKey, false);
  console.log(`Processing ${products.length} products...`);

  let counter = 0;
  for (let product of products) {
    counter++;
    if (product.m_id) continue; // Skip if already mapped
    if (!product.title) {
      console.warn(
        `Skipping product with missing title: ${JSON.stringify(product)}`
      );
      continue;
    }

    let matchedBrands = new Set<string>();

    // **Optimized Brand Matching Using Reverse Lookup Table**
    Object.entries(brandsMapping).forEach(([brandKey, relatedBrands]) => {
      if (matchedBrands.has(brandKey)) return;
      for (const brand of relatedBrands) {
        if (matchedBrands.has(brand)) continue;
        if (checkBrandIsSeparateTerm(product.title, brand)) {
          matchedBrands.add(brand);
        }
      }
    });

    // Sort matched brands based on priority rules
    const matchedBrandsArray = Array.from(matchedBrands).sort((a, b) => {
      const aPriority = PRIORITY_WORDS.includes(a.toUpperCase()) ? -1 : 0;
      const bPriority = PRIORITY_WORDS.includes(b.toUpperCase()) ? -1 : 0;
      return bPriority - aPriority || a.localeCompare(b);
    });

    console.log(`${product.title} -> ${matchedBrandsArray}`);

    // Assigning brand to product metadata
    const sourceId = product.source_id;
    const meta = { matchedBrands: matchedBrandsArray };
    const brand = matchedBrandsArray.length ? matchedBrandsArray[0] : null;
    const key = `${source}_${countryCode}_${sourceId}`;
    const uuid = stringToHash(key);

    // 🚀 **TODO: Insert into the product mapping table**
    // Example: await insertIntoDb({ uuid, source, countryCode, sourceId, brand, meta });
    console.log(`Processed ${counter}/${products.length}`);
  }
}
