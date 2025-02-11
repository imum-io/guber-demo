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
import items from "./../../pharmacyItems.json";
import connections from "./../../brandConnections.json";
//json file
const jsonfile = require("jsonfile");

type BrandsMapping = {
  [key: string]: string[];
};

export async function getBrandsMapping(): Promise<BrandsMapping> {
  //   //     const query = `
  //   //     SELECT
  //   //     LOWER(p1.manufacturer) manufacturer_p1
  //   //     , LOWER(GROUP_CONCAT(DISTINCT p2.manufacturer ORDER BY p2.manufacturer SEPARATOR ';')) AS manufacturers_p2
  //   // FROM
  //   //     property_matchingvalidation v
  //   // INNER JOIN
  //   //     property_pharmacy p1 ON v.m_source = p1.source
  //   //     AND v.m_source_id = p1.source_id
  //   //     AND v.m_country_code = p1.country_code
  //   //     AND p1.newest = true
  //   // INNER JOIN
  //   //     property_pharmacy p2 ON v.c_source = p2.source
  //   //     AND v.c_source_id = p2.source_id
  //   //     AND v.c_country_code = p2.country_code
  //   //     AND p2.newest = true
  //   // WHERE
  //   //     v.m_source = 'AZT'
  //   //     AND v.engine_type = '${EngineType.Barcode}'
  //   //     and p1.manufacturer is not null
  //   //     and p2.manufacturer is not null
  //   //     and p1.manufacturer not in ('kita', 'nera', 'cits')
  //   //     and p2.manufacturer not in ('kita', 'nera', 'cits')
  //   // GROUP BY
  //   //     p1.manufacturer
  //   //     `
  //   //     const brandConnections = await executeQueryAndGetResponse(dbServers.pharmacy, query)
  //   // For this test day purposes exported the necessary object

  const brandConnections = connections;
  const brandMap = new Map<string, Set<string>>();

  // Build initial brand relationships
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

  // Helper function to determine a single brand per group
  const getRepresentativeBrand = (brands: Set<string>) => {
    return [...brands].sort()[0]; // Always pick the first in alphabetical order
  };

  // Flatten and normalize brand groups
  const flatMap = new Map<string, string>();

  brandMap.forEach((relatedBrands, brand) => {
    const fullSet = new Set<string>(relatedBrands);
    fullSet.add(brand);
    const representativeBrand = getRepresentativeBrand(fullSet);
    fullSet.forEach((b) => flatMap.set(b, representativeBrand));
  });

  // Convert mapping to object
  const flatMapObject: BrandsMapping = {};
  flatMap.forEach((repBrand, brand) => {
    flatMapObject[brand] = [repBrand];
  });

  return flatMapObject;
}

async function getPharmacyItems(
  countryCode: countryCodes,
  source: sources,
  versionKey: string,
  mustExist = true
) {
  //     let query = `
  //     SELECT
  //     p.url, p.removed_timestamp, p.title, p.source_id
  //     , p.manufacturer
  //     , map.source_id m_id
  //     , map.source
  //     , map.country_code
  //     , map.meta
  // FROM
  //     property_pharmacy p
  // left join pharmacy_mapping map on p.source_id = map.source_id and p.source = map.source and p.country_code = map.country_code
  // WHERE
  //     p.newest = TRUE
  //     and p.country_code = '${countryCode}'
  //     and p.source = '${source}'
  //     and p.removed_timestamp is null
  //     and (p.manufacturer is null or p.manufacturer in ('nera', 'kita', 'cits'))
  //     ORDER BY p.removed_timestamp IS NULL DESC, p.removed_timestamp DESC
  //     `
  //     let products = await executeQueryAndGetResponse(dbServers.pharmacy, query)
  //     for (let product of products) {
  //         product.meta = jsonOrStringToJson(product.meta)
  //     }

  //     let finalProducts = products.filter((product) => (!mustExist || product.m_id) && !product.meta[versionKey])
  const finalProducts = items;

  return finalProducts;
}

export function checkBrandIsSeparateTerm(
  input: string,
  brand: string
): boolean {
  // Escape any special characters in the brand name for use in a regular expression
  const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Check if the brand is at the beginning or end of the string
  const atBeginningOrEnd = new RegExp(
    `^(?:${escapedBrand}\\s|.*\\s${escapedBrand}\\s.*|.*\\s${escapedBrand})$`,
    "i"
  ).test(input);

  // Check if the brand is a separate term in the string
  const separateTerm = new RegExp(`\\b${escapedBrand}\\b`, "i").test(input);

  // The brand should be at the beginning, end, or a separate term
  return atBeginningOrEnd || separateTerm;
}

export async function assignBrandIfKnown(
  countryCode: countryCodes,
  source: sources,
  job?: Job
) {
  const context = { scope: "assignBrandIfKnown" } as ContextType;

  let brandsMapping: BrandsMapping = await getBrandsMapping();
  //brandsMapping = brandsMapping.length > 0 ? brandsMapping : {};

  // Write the brandsMapping object to a JSON file as initial
  const file = "./update_filter_brand_data.json";
  jsonfile.writeFileSync(file, brandsMapping);

  const versionKey = "assignBrandIfKnown";
  let products = await getPharmacyItems(countryCode, source, versionKey, false);
  let counter = 0;

  // added update product data to update_data_pharmacyItems.json for check
  let updateProducts: any = [];

  // added initial product data to old_product_data.json for test
  const oldProductDataFile = "./old_product_data.json";
  jsonfile.writeFileSync(oldProductDataFile, products);

  // Loop through each product and assign a brand
  for (let product of products) {
    counter++;

    if (product.m_id) {
      // Already exists in the mapping table, probably no need to update
      updateProducts.push(product);
      continue;
    }

    let matchedBrands = []; // brand list as array
    for (const brandKey in brandsMapping) {
      const relatedBrands = brandsMapping[brandKey];
      // '3chenes': [
      // '3c pharma laboratoires',
      // 'les 3 chenes',
      // '3chenes',
      // 'color&soin'
      // ],
      for (const brand of relatedBrands) {
        // brand: 3c pharma laboratoires
        if (matchedBrands.includes(brand)) {
          continue;
        }
        // title: BD DISCARDIT 2ML, 2 DALIŲ ŠVIRKŠTAS SU ADATA (BD, JAV
        // checkBrandIsSeparateTerm will check if the brand is at the beginning or end of the string or contains the brand
        const isBrandMatch = checkBrandIsSeparateTerm(product.title, brand);
        if (isBrandMatch) {
          // After confirming the match, validate the brand using the brandValidation method
          const validBrand = brandValidation(product.title);
          if (validBrand && !matchedBrands.includes(validBrand)) {
            matchedBrands.push(validBrand); // Add only valid brands based on brandValidation logic
          }

          // matchedBrands.push(brand);
        }
      }
    }
    // arr.push(matchedBrands);
    console.log(`${product.title} -> ${_.uniq(matchedBrands)}`);
    const sourceId = product.source_id;
    const meta = { matchedBrands };
    const brand = matchedBrands.length ? matchedBrands[0] : null;

    const key = `${source}_${countryCode}_${sourceId}`;
    const uuid = stringToHash(key);

    // Then brand is inserted into product mapping table
    // Then brand is inserted into product mapping table
    updateProducts.push({
      ...product,
      m_id: product.source_id,
      source,
      country_code: countryCode,
      meta,
    });
  }

  const pharmacyItemsFile = "./update_product_data.json";
  jsonfile.writeFileSync(pharmacyItemsFile, updateProducts);
}

// modify

const brandValidation = (input) => {
  if (!input || typeof input !== "string") return null;

  // Normalize Babē => Babe
  input = input.replace(/\bBabē\b/gi, "Babe");

  // Ignore BIO, NEB (case-insensitive)
  if (/\b(BIO|NEB)\b/i.test(input)) return null;

  // Priority brands (must be at the beginning)
  const priorityBrands = [
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
    "LIVOL",
  ];
  // Secondary brands (must be in the first or second word position)
  const secondaryBrands = ["heel", "contour", "nero", "rsv"];

  const words = input.split(/\s+/); // Split input into words

  // 1. Check if a priority brand is at the beginning (ensures "happy" only works in front)
  if (priorityBrands.includes(words[0])) {
    return words[0];
  }

  // 2. Check if a secondary brand is in the first or second word position
  if (words.length > 1) {
    if (secondaryBrands.includes(words[0])) {
      return words[0]; // Return if secondary brand is at the first position
    }
    if (secondaryBrands.includes(words[1])) {
      return words[1]; // Return if secondary brand is at the second position
    }
  }

  // 3. Ensure "HAPPY" is matched only when fully capitalized anywhere in the string
  if (/\bHAPPY\b/.test(input)) return "HAPPY";

  return null; // If no valid brand matches the conditions
};

console.log(brandValidation("test happy cream ultra free"));
// null (because "happy" is not in the front)

console.log(brandValidation("happy cream ultra free"));
//  "happy" (because "happy" is in front)

console.log(brandValidation("HAPPY cream ultra free"));
//  "HAPPY" (fully capitalized match)

console.log(brandValidation("ultra shampoo rich flex"));
//  "ultra" (priority brand at the beginning)

console.log(brandValidation("rsv gum shampoo"));
//  "heel" (first word match)

console.log(brandValidation("test heel gum shampoo"));
//  "heel" (second word match)

console.log(brandValidation("Babē skin care"));
//  "Babe" (normalized Babē => Babe)

console.log(brandValidation("BIO rich shampoo"));
//  null (BIO is ignored)

console.log(brandValidation("NEB ultra shampoo"));
// null (NEB is ignored)

console.log(brandValidation("rich heel nero"));
//  "rich" (priority brand at the beginning)
console.log(brandValidation("RICH heel nero"));

console.log(brandValidation("nero heel gum"));
//  "nero" (secondary brand in second position)

console.log(brandValidation("kin ultra shampoo"));
//  "kin" (priority brand in front)

console.log(brandValidation("112 beauty orto"));
//  "112" (priority brand in front)
