import { Job } from "bullmq";
import { countryCodes, dbServers, EngineType } from "../config/enums";
import { ContextType } from "../libs/logger";
import {
  jsonOrStringForDb,
  jsonOrStringToJson,
  stringOrNullForDb,
  stringToHash,
  writeJsonIntoFile,
} from "../utils";
import _ from "lodash";
import { sources } from "../sites/sources";
import items from "./../../data/pharmacyItems.json";
import connections from "./../../data/brandConnections.json";

type BrandsMapping = {
  [key: string]: string[];
};

/**
 * normalizes brand names by making it lowercase and removing diacritics marks
 */
function normalizeBrand(brand: string): string {
  return brand
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function getBrandsMapping(): Promise<BrandsMapping> {
  const brandConnections = connections;
  //helper function to recursively find all related brands for a given brand
  const getRelatedBrands = (
    map: Map<string, Set<string>>,
    brand: string
  ): Set<string> => {
    const relatedBrands = new Set<string>();
    const queue = [brand];
    while (queue.length > 0) {
      const current = queue.pop()!;
      if (map.has(current)) {
        const brands = map.get(current)!;
        for (const b of brands) {
          if (!relatedBrands.has(b)) {
            relatedBrands.add(b);
            queue.push(b);
          }
        }
      }
    }
    return relatedBrands;
  };

  // Create a map to track brand relationships
  const brandMap = new Map<string, Set<string>>();

  brandConnections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
    const brand1 = manufacturer_p1.toLowerCase();
    const brands2 = manufacturers_p2.toLowerCase();
    const brand2Array = brands2.split(";").map((b) => b.trim());
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

  // Build the final flat map
  const flatMap = new Map<string, Set<string>>();

  brandMap.forEach((_, brand) => {
    const relatedBrands = getRelatedBrands(brandMap, brand);
    flatMap.set(brand, relatedBrands);
  });

  // Convert the flat map to an object for easier usage
  const flatMapObject: Record<string, string[]> = {};

  flatMap.forEach((relatedBrands, brand) => {
    flatMapObject[brand] = Array.from(relatedBrands);
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

/**
 * matches brands to a product title based on the validation rules
 * handles edge cases like normalization for brands, priority brands, brands with specific position, and capitalization for brand
 */
function matchBrandsToProduct(
  product: any,
  brandsMapping: BrandsMapping,
  frontPriorityBrands: string[]
): { matchedBrands: Set<string>; priorityBrands: Set<string> } {
  let matchedBrands = new Set<string>();
  let priorityBrands = new Set<string>();

  for (const brandKey in brandsMapping) {
    const relatedBrands = [brandKey, ...brandsMapping[brandKey]];
    for (const brand of relatedBrands) {
      if (matchedBrands.has(brand)) continue;
      const normalizedBrand = normalizeBrand(brand);

      // Ignore BIO, NEB
      if (normalizedBrand.includes("bio") || normalizedBrand.includes("neb"))
        continue;

      // Check if specific brands must be at the front of the title
      if (frontPriorityBrands.some((b) => normalizedBrand.includes(b))) {
        if (product.title.toLowerCase().includes(normalizedBrand)) {
          priorityBrands.add(brand);
          continue;
        }
      }

      // Specific brands can be at the start or second word
      if (["heel", "contour", "nero", "rsv"].includes(normalizedBrand)) {
        const words = product.title.toLowerCase().split(" ");
        if (![words[0], words[1]].includes(normalizedBrand)) continue;
      }

      // Ensure "HAPPY" matches with correct capitalization
      if (brand === "HAPPY" && !product.title.includes("HAPPY")) continue;

      // Check if brand is separate term in the title
      if (checkBrandIsSeparateTerm(product.title, brand)) {
        matchedBrands.add(brand);
      }
    }
  }
  return { matchedBrands, priorityBrands };
}

/**
 * assign a single brand to a group of related products for consistency
 * ensure that when a brand is chosen, it's reused for all related products in the group
 */
function assignBrandToGroup(
  sortedBrands: string[],
  brandsMapping: BrandsMapping,
  assignedBrands: Map<string, string>
): string {
  let groupBrand = null;
  for (const mb of sortedBrands) {
    const normalizedMB = normalizeBrand(mb);
    if (assignedBrands.has(mb)) {
      groupBrand = assignedBrands.get(mb);
      break;
    }
    for (const related of brandsMapping[normalizedMB] || []) {
      if (assignedBrands.has(related)) {
        groupBrand = assignedBrands.get(related);
        break;
      }
    }
    if (groupBrand) break;
  }
  if (!groupBrand && sortedBrands.length > 0) {
    groupBrand = sortedBrands[0];
    assignedBrands.set(groupBrand, groupBrand);
  }
  return groupBrand;
}

/**
 * main function to assign brands to pharmacy items
 * processes products, matches brands, sorts brands, and assigns a consistent brand per group
 */

export async function assignBrandIfKnown(
  countryCode: countryCodes,
  source: sources,
  job?: Job
) {
  const context = { scope: "assignBrandIfKnown" } as ContextType;
  const brandsMapping = await getBrandsMapping();
  const versionKey = "assignBrandIfKnown";
  let products = await getPharmacyItems(countryCode, source, versionKey, false);
  let updatedProducts = [];
  let assignedBrands = new Map<string, string>(); // Track assigned brands for consistency
  const frontPriorityBrands = [
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
  ];

  for (let product of products) {
    if (product.m_id) continue; // Skip if already in mapping table

    const { matchedBrands, priorityBrands } = matchBrandsToProduct(
      product,
      brandsMapping,
      frontPriorityBrands
    );
    const allBrands = new Set([...priorityBrands, ...matchedBrands]);
    //sort brands, prioritizing those at the beginning
    const sortedBrands = Array.from(allBrands).sort((a, b) => {
      const aBrand = normalizeBrand(a);
      const bBrand = normalizeBrand(b);
      const aIsPriority = frontPriorityBrands.some((p) => aBrand.includes(p));
      const bIsPriority = frontPriorityBrands.some((p) => bBrand.includes(p));
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      return (
        product.title.toLowerCase().indexOf(aBrand) -
        product.title.toLowerCase().indexOf(bBrand)
      );
    });

    const brand = assignBrandToGroup(
      sortedBrands,
      brandsMapping,
      assignedBrands
    );

    const sourceId = product.source_id;
    const meta = { matchedBrands: sortedBrands };
    const key = `${source}_${countryCode}_${sourceId}`;
    const uuid = stringToHash(key);

    updatedProducts.push({
      ...product,
      manufacturer: brand,
      meta: jsonOrStringForDb(meta),
      uuid: uuid,
    });
    // Then brand is inserted into product mapping table
    console.log(`${product.title} -> ${sortedBrands}`);
  }
}
