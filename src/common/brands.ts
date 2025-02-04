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
import { brandRules } from "./brandRules";
import { removeDiacritics } from "../utils/diacritics";

type BrandsMapping = {
  [key: string]: string[];
};

export async function getBrandsMapping(): Promise<BrandsMapping> {
  //     const query = `
  //     SELECT
  //     LOWER(p1.manufacturer) manufacturer_p1
  //     , LOWER(GROUP_CONCAT(DISTINCT p2.manufacturer ORDER BY p2.manufacturer SEPARATOR ';')) AS manufacturers_p2
  // FROM
  //     property_matchingvalidation v
  // INNER JOIN
  //     property_pharmacy p1 ON v.m_source = p1.source
  //     AND v.m_source_id = p1.source_id
  //     AND v.m_country_code = p1.country_code
  //     AND p1.newest = true
  // INNER JOIN
  //     property_pharmacy p2 ON v.c_source = p2.source
  //     AND v.c_source_id = p2.source_id
  //     AND v.c_country_code = p2.country_code
  //     AND p2.newest = true
  // WHERE
  //     v.m_source = 'AZT'
  //     AND v.engine_type = '${EngineType.Barcode}'
  //     and p1.manufacturer is not null
  //     and p2.manufacturer is not null
  //     and p1.manufacturer not in ('kita', 'nera', 'cits')
  //     and p2.manufacturer not in ('kita', 'nera', 'cits')
  // GROUP BY
  //     p1.manufacturer
  //     `
  //     const brandConnections = await executeQueryAndGetResponse(dbServers.pharmacy, query)
  // For this test day purposes exported the necessary object
  const brandConnections = connections;

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
  title: string,
  brand: string
): boolean {
  // Normalize both input and brand
  const normalizedInput = removeDiacritics(title.toLowerCase());
  const normalizedBrand = removeDiacritics(brand.toLowerCase());

  // Skip if it's an ignored brand
  if (brandRules.ignoreBrands.includes(normalizedBrand.toUpperCase())) {
    return false;
  }

  // Check position requirements
  if (brandRules.mustBeFirst.includes(normalizedBrand)) {
    const firstWord = normalizedInput.split(/\s+/)[0];
    return firstWord === normalizedBrand;
  }

  if (brandRules.firstOrSecondWord.includes(normalizedBrand)) {
    const words = normalizedInput.split(/\s+/);
    return words[0] === normalizedBrand || words[1] === normalizedBrand;
  }

  // Check capitalization requirements
  if (brandRules.capitalizedBrands.includes(brand.toUpperCase())) {
    return title.includes(brand.toUpperCase());
  }

  // For other brands, check if it's a separate term
  const escapedBrand = normalizedBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|\\s)${escapedBrand}($|\\s)`, "i");
  return pattern.test(normalizedInput);
}

function normalizeBrandName(brand: string): string {
  // Remove diacritics and normalize
  const normalized = removeDiacritics(brand.toLowerCase().trim());

  // Apply any specific normalizations
  return brandRules.normalizations[normalized] || normalized;
}

function prioritizeBrands(matchedBrands: string[], title: string): string[] {
  return matchedBrands.sort((a, b) => {
    // Check priority list first
    const aIndex = brandRules.brandPriority?.indexOf(a.toUpperCase()) ?? -1;
    const bIndex = brandRules.brandPriority?.indexOf(b.toUpperCase()) ?? -1;
    if (aIndex !== -1 || bIndex !== -1) {
      return (
        (aIndex === -1 ? Infinity : aIndex) -
        (bIndex === -1 ? Infinity : bIndex)
      );
    }

    // Then check position in title
    const aPos = title.toLowerCase().indexOf(a.toLowerCase());
    const bPos = title.toLowerCase().indexOf(b.toLowerCase());
    return aPos - bPos;
  });
}

// we can memoize this function
// const normalizeBrandGroupsMemo = _.memoize(normalizeBrandGroups);
// this will improve performance for large datasets
function normalizeBrandGroups(
  brandsMapping: BrandsMapping
): Map<string, string> {
  const normalizedGroups = new Map<string, string>();
  const processedGroups = new Set<string>();

  // Process each brand group
  for (const [brand, relatedBrands] of Object.entries(brandsMapping)) {
    if (processedGroups.has(brand.toLowerCase())) continue;

    // Get all brands in this group
    const groupBrands = new Set<string>();
    const queue = [...relatedBrands];

    while (queue.length > 0) {
      const currentBrand = queue.pop()!;
      if (groupBrands.has(currentBrand.toLowerCase())) continue;

      groupBrands.add(currentBrand.toLowerCase());
      processedGroups.add(currentBrand.toLowerCase());

      // Add related brands to queue
      const related = brandsMapping[currentBrand] || [];
      queue.push(...related);
    }

    // Choose a representative brand for this group
    // (using the first brand alphabetically for consistency)
    const representativeBrand = Array.from(groupBrands).sort()[0];

    // Map all brands in group to the representative brand
    groupBrands.forEach((groupBrand) => {
      normalizedGroups.set(groupBrand, representativeBrand);
    });
  }

  return normalizedGroups;
}

// Update assignBrandIfKnown to use normalized groups
export async function assignBrandIfKnown(
  countryCode: countryCodes,
  source: sources,
  job?: Job
) {
  const brandsMapping = await getBrandsMapping();
  const normalizedGroups = normalizeBrandGroups(brandsMapping);
  const versionKey = "assignBrandIfKnown";
  let products = await getPharmacyItems(countryCode, source, versionKey, false);

  for (let product of products) {
    if (product.m_id) continue;

    let matchedBrands = [];

    // Try to match brands
    for (const brandKey in brandsMapping) {
      const relatedBrands = brandsMapping[brandKey];
      for (const brand of relatedBrands) {
        if (shouldIgnoreBrand(brand)) continue;

        const normalizedBrand = normalizeBrandName(brand);
        if (checkBrandIsSeparateTerm(product.title, normalizedBrand)) {
          matchedBrands.push(brand);
        }
      }
    }

    // If multiple brands matched, prioritize the one at the beginning
    if (matchedBrands.length > 1) {
      matchedBrands.sort((a, b) => {
        const aPos = product.title.toLowerCase().indexOf(a.toLowerCase());
        const bPos = product.title.toLowerCase().indexOf(b.toLowerCase());
        return aPos - bPos;
      });
    }

    // Get the matched brand
    let brand = matchedBrands.length ? matchedBrands[0] : null;

    // If we found a brand, normalize it to the group representative
    if (brand) {
      brand = normalizedGroups.get(brand.toLowerCase()) || brand;
    }

    console.log(`${product.title} -> ${brand || undefined}`);
    const sourceId = product.source_id;
    const meta = { matchedBrands };

    const key = `${source}_${countryCode}_${sourceId}`;
    const uuid = stringToHash(key);

    // Then brand is inserted into product mapping table
  }
}

function shouldIgnoreBrand(brand: string): boolean {
  return brandRules.ignoreBrands.includes(brand.toUpperCase());
}
