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
import items from "../files/pharmacyItems.json";
import connections from "../files/brandConnections.json";

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

// export async function assignBrandIfKnown(
//   countryCode: countryCodes,
//   source: sources,
//   job?: Job
// ) {
//   const context = { scope: "assignBrandIfKnown" } as ContextType;

//   const brandsMapping = await getBrandsMapping();

//   const versionKey = "assignBrandIfKnown";
//   let products = await getPharmacyItems(countryCode, source, versionKey, false);
//   let counter = 0;
//   for (let product of products) {
//     counter++;

//     if (product.m_id) {
//       // Already exists in the mapping table, probably no need to update
//       continue;
//     }

//     let matchedBrands = [];

//     for (const brandKey in brandsMapping) {
//       const relatedBrands = brandsMapping[brandKey];
//       for (const brand of relatedBrands) {
//         if (matchedBrands.includes(brand)) {
//           continue;
//         }
//         const isBrandMatch = checkBrandIsSeparateTerm(product.title, brand);
//         if (isBrandMatch) {
//           matchedBrands.push(brand);
//         }
//       }
//     }
//     console.log(`${product.title} -> ${_.uniq(matchedBrands)}`);
//     const sourceId = product.source_id;
//     const meta = { matchedBrands };
//     const brand = matchedBrands.length ? matchedBrands[0] : null;

//     const key = `${source}_${countryCode}_${sourceId}`;
//     const uuid = stringToHash(key);

//     // Then brand is inserted into product mapping table
//   }
// }

export async function assignBrandIfKnown(
  countryCode: countryCodes,
  source: sources,
  job?: Job
) {
  const brandsMapping = await getBrandsMapping();
  const versionKey = "assignBrandIfKnown";
  const products = await getPharmacyItems(
    countryCode,
    source,
    versionKey,
    false
  );
  const brandAssignments = new Map();

  // Pre-process brandsMapping for faster matching.
  const processedBrandsMapping = preprocessBrandsMapping(brandsMapping);
  console.log({ processedBrandsMapping });

  for (const product of products) {
    if (product.m_id) continue; // Skip already mapped products.

    const matchedBrands = findMatchingBrands(
      product.title,
      processedBrandsMapping
    );

    if (matchedBrands.length === 0) continue; // Skip if no brands matched.
    console.log({ matchedBrands });

    const chosenBrand = prioritizeBrand(product.title, matchedBrands);

    if (chosenBrand) {
      brandAssignments.set(
        generateProductKey(source, countryCode, product.source_id),
        chosenBrand
      );
    }
  }

  const consolidatedBrandsMapping = consolidateBrandAssignments(
    brandsMapping,
    brandAssignments
  );
  console.log({ consolidatedBrandsMapping });

  // save consolidatedBrandsMapping in db
}

function preprocessBrandsMapping(brandsMapping) {
  const processed = new Map();
  for (const canonicalBrand in brandsMapping) {
    const variations = brandsMapping[canonicalBrand];
    for (const variation of variations) {
      processed.set(variation.toLowerCase(), canonicalBrand); // Using lowercase for case-insensitive matching
    }
  }
  return processed;
}

function findMatchingBrands(title, processedBrandsMapping) {
  const matchedBrands = new Set(); // Using a Set to avoid duplicates.

  for (const brandVariation of processedBrandsMapping.keys()) {
    if (isBrandMatch(title, brandVariation)) {
      matchedBrands.add(processedBrandsMapping.get(brandVariation));
    }
  }
  return Array.from(matchedBrands);
}

const isBrandMatch = (title, brand) => {
  const regex = new RegExp(`\\b${brand}\\b`, "i"); // Word boundaries for accurate matching
  return regex.test(title);
};

const prioritizeBrand = (title, matchedBrands) => {
  const priorityWordsStart = new Set([
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
  const priorityWordsMiddle = new Set(["heel", "contour", "nero", "rsv"]);
  const titleWords = title.split(/\s+/);

  let bestMatch = null;
  let bestScore = -1;

  for (const brand of matchedBrands) {
    let score = 0;

    if (brand === "HAPPY" && !title.includes("HAPPY")) continue; // Case 6: HAPPY capitalization

    if (title.startsWith(brand)) score += 2; // Case 5: Prioritize beginning match

    const brandWords = brand.split(/\s+/);

    for (const word of titleWords) {
      if (priorityWordsStart.has(word) && brand.startsWith(word)) score++; // Case 3
      if (
        priorityWordsMiddle.has(word) &&
        (brandWords.indexOf(word) === 0 || brandWords.indexOf(word) === 1)
      )
        score++; // Case 4
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = brand;
    }
  }

  return bestMatch;
};

const consolidateBrandAssignments = (brandsMapping, brandAssignments) => {
  const consolidatedBrandsMapping = {};

  for (const [productKey, assignedBrand] of brandAssignments) {
    let canonicalBrand = findCanonicalBrand(brandsMapping, assignedBrand);

    if (canonicalBrand) {
      consolidatedBrandsMapping[canonicalBrand] = brandsMapping[canonicalBrand];
    } else {
      consolidatedBrandsMapping[assignedBrand] = [assignedBrand]; // New brand
    }
  }

  return consolidatedBrandsMapping;
};

const findCanonicalBrand = (brandsMapping, assignedBrand) => {
  for (const canonicalBrand in brandsMapping) {
    if (brandsMapping[canonicalBrand].includes(assignedBrand)) {
      return canonicalBrand;
    }
  }
  return undefined;
};

const generateProductKey = (source, countryCode, sourceId) => {
  return `${source}_${countryCode}_${sourceId}`;
};
