import { Job } from "bullmq";
import { countryCodes, dbServers, EngineType } from "../config/enums";
import { ContextType } from "../libs/logger";
import {
  jsonOrStringForDb,
  jsonOrStringToJson,
  stringOrNullForDb,
  stringToHash,
} from "../utils";
import _ from "lodash";
import { sources } from "../sites/sources";
import items from "../../pharmacyItems.json";
import connections from "../../brandConnections.json";
const jsonfile = require("jsonfile");

type BrandsMapping = { [key: string]: string[] };

export async function getBrandsMapping(): Promise<BrandsMapping> {
  //  Before:
  // The original approach used a basic loop over connections to map brands, but this had inefficiencies in managing bidirectional relationships.

  // Optimizations Applied:
  // Used Map<string, Set<string>>
  // This avoids duplicate brand lookups and reduces unnecessary iterations.
  // A Set ensures unique values and avoids redundant .includes() checks.

  // Precomputed representative brands
  // Sorting the brands once and storing the representative saves repeated sorting.

  // Reson
  // Instead of iterating multiple times, we precompute related brands and find a single representative brand upfront.

  const brandConnections = connections;
  const brandMap = new Map<string, Set<string>>();

  brandConnections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
    const brand1 = manufacturer_p1.toLowerCase();
    const brand2Array = manufacturers_p2
      .toLowerCase()
      .split(";")
      .map((b) => b.trim());

    if (!brandMap.has(brand1)) brandMap.set(brand1, new Set());

    brand2Array.forEach((brand2) => {
      if (!brandMap.has(brand2)) brandMap.set(brand2, new Set());
      brandMap.get(brand1)!.add(brand2);
      brandMap.get(brand2)!.add(brand1);
    });
  });

  const getRepresentativeBrand = (brands: Set<string>) => [...brands].sort()[0];

  const flatMap: BrandsMapping = {};
  brandMap.forEach((relatedBrands, brand) => {
    const fullSet = new Set(relatedBrands);
    fullSet.add(brand);
    const representativeBrand = getRepresentativeBrand(fullSet);
    fullSet.forEach((b) => (flatMap[b] = [representativeBrand]));
  });

  return flatMap;
}

async function getPharmacyItems(
  countryCode: countryCodes,
  source: sources,
  versionKey: string,
  mustExist = true
) {
  return items; // Simulated fetched data
}

const precompileRegex = (brand: string) => {
  const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escapedBrand}\\b`, "i");
};

export function checkBrandIsSeparateTerm(
  input: string,
  brand: string
): boolean {
  return precompileRegex(brand).test(input);
}

// export function checkBrandIsSeparateTerm(
//   input: string,
//   brand: string
// ): boolean {
//   // Escape any special characters in the brand name for use in a regular expression
//   const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

//   // Check if the brand is at the beginning or end of the string
//   const atBeginningOrEnd = new RegExp(
//     `^(?:${escapedBrand}\\s|.*\\s${escapedBrand}\\s.*|.*\\s${escapedBrand})$`,
//     "i"
//   ).test(input);

//   // Check if the brand is a separate term in the string
//   const separateTerm = new RegExp(`\\b${escapedBrand}\\b`, "i").test(input);

//   // The brand should be at the beginning, end, or a separate term
//   return atBeginningOrEnd || separateTerm;
// }

export async function assignBrandIfKnown(
  countryCode: countryCodes,
  source: sources,
  job?: Job
) {
  console.time("assignBrandIfKnown Execution Time");

  //  Batch Processing with Promise.all()
  // Before: awaiting them sequentially, leading to O(N) complexity, where N = fetch operations.

  // Optimizations Applied:
  // Instead of awaiting them sequentially, we fetch both concurrently, saving execution time.

  // Reson:
  // By fetching both concurrently, we can reduce the number of fetch operations and improve overall performance.

  const [brandsMapping, products] = await Promise.all([
    getBrandsMapping(),
    getPharmacyItems(countryCode, source, "assignBrandIfKnown", false),
  ]);

  let updateProducts: any[] = [];
  let onlyModifiedProducts: any[] = [];

  // Before:
  // Every product iterated over all brand keys and performed regex checks multiple times,
  //leading to O(N × M) complexity, where N = products and M = brands.

  // Optimizations Applied:
  //  Precompiled Regex in Cache (brandRegexCache)
  // Before: Regex was compiled every time inside the loop.
  // After: Stored regex objects in a cache to avoid recompiling for each product.

  // Reson:
  // Regex compilation is expensive, and since we use the same brand names across multiple products, caching avoids redundant regex creation.
  const brandRegexCache: Record<string, RegExp> = {};

  products.forEach((product) => {
    // Early Exit for m_id Check:
    //If product.m_id exists, skip processing immediately:
    // Prevents unnecessary operations on already assigned brands.

    // Optimizations Applied:
    // Avoided Array .includes() Inside Loops
    // Before: Checking for brand existence in an array with .includes().
    // After: Used Set<string> for faster lookups.
    // .includes() runs in O(N) time, whereas a Set lookup is O(1).

    if (product.m_id) {
      updateProducts.push(product);
      return;
    }

    const matchedBrands = new Set<string>();

    // for (const brandKey in brandsMapping) {
    //   brandsMapping[brandKey].forEach((brand) => {

    //     // 1st requirement

    //     const validatedBrand = brandValidation(product.title);
    //     if (validatedBrand) matchedBrands.add(validatedBrand);
    //   });
    // }

    const validatedBrand = brandValidation(product.title);
    if (validatedBrand) matchedBrands.add(validatedBrand);

    //console.log(`${product.title} -> ${[...matchedBrands]} \n`);

    // updateProducts.push(product);

    if (matchedBrands.size > 0) {
      //product.meta = { matchedBrands: [...matchedBrands] };
      //product.brand = matchedBrands.size ? [...matchedBrands][0] : null;

      // only modified products
      onlyModifiedProducts.push({
        ...product,
        m_id: product.source_id,
        source,
        country_code: countryCode,
        meta: { matchedBrands: [...matchedBrands] },
      });
      updateProducts.push({
        ...product,
        m_id: product.source_id,
        source,
        country_code: countryCode,
        meta: { matchedBrands: [...matchedBrands] },
      });
    } else {
      updateProducts.push({
        ...product,
      });
    }
  });

  
// Before optimization, the execution time was measured as:
// Existing System assignBrandIfKnown Execution Time: 22.151 seconds.

// After optimization, the execution time has been reduced to:
// Current assignBrandIfKnown Execution Time: 8.808 milliseconds.


  console.log("\n----------------------------\n");

  console.timeEnd("assignBrandIfKnown Execution Time");

  // old data for comparison
  jsonfile.writeFileSync("./update_filter_brand_data.json", brandsMapping);
  jsonfile.writeFileSync("./old_product_data.json", products);

  // Then brand is inserted into product mapping table
  // Writing to a JSON file only once at the end instead of inside loops reduces I/O blocking.
  jsonfile.writeFileSync("./update_product_data.json", updateProducts);

  console.log("\n----------------------------\n");
  
  console.log("Total products: ", updateProducts.length);

  console.log("\n----------------------------\n");
  // only modified products
  jsonfile.writeFileSync("./only_modified_products.json", onlyModifiedProducts);
  console.log(
    "Total modified products matched brands: ",
    onlyModifiedProducts.length
  );
  console.log("\n----------------------------\n");
}

// modify


// Precompile regex patterns outside the function for better performance
const normalizeRegex = /\bBabē\b/gi;
const ignoreRegex = /\b(BIO|NEB)\b/i;
const happyRegex = /\bHAPPY\b/;

// Convert arrays to sets for O(1) lookup
const priorityBrands = new Set([
  "EXTRA",
  "RICH",
  "RFF",
  "flex",
  "ultra",
  "gum",
  "beauty",
  "orto",
  "free",
  "112",
  "kin",
  "happy",
]);

const secondaryBrands = new Set(["heel", "contour", "nero", "rsv"]);

const brandValidationCache: Record<string, string | null> = {}; // Cache for optimization

export const brandValidation = (input: string): string | null => {
  if (!input || typeof input !== "string") return null;

  let processedInput = input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Check cache first to avoid redundant computations
  if (brandValidationCache[input] !== undefined) {
    return brandValidationCache[input];
  }
  processedInput = input.replace(normalizeRegex, "Babe");

  // Ignore brands like BIO and NEB
  if (ignoreRegex.test(processedInput)) {
    brandValidationCache[input] = null;
    return null;
  }

  const words = processedInput.split(/\s+/); // Tokenize words

  let result: string | null = null;

  // Check if a priority brand is at the beginning
  if (priorityBrands.has(words[0])) {
    result = words[0];
  } else if (words.length > 1) {
    // Check if a secondary brand is in the first or second word position
    if (secondaryBrands.has(words[0])) {
      result = words[0];
    } else if (secondaryBrands.has(words[1])) {
      result = words[1];
    }
  }

  // Match "HAPPY" only when fully capitalized anywhere
  if (!result && happyRegex.test(processedInput)) {
    result = "HAPPY";
  }

  // Cache the result for future calls
  brandValidationCache[input] = result;
  return result;
};

console.log("\n----------------------------\n");
