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
    console.log(400, "brand", brand);
    //console.log(500, { map });

    const relatedBrands = new Set<string>();
    const queue = [brand];
    console.log(401, "queue ", queue);
    while (queue.length > 0) {
      console.log(402, "queue ", queue.length);

      const current = queue.pop()!;
      console.log(403, "current ", current);
      if (map.has(current)) {
        const brands = map.get(current)!;
        console.log(404, "brands ", brands);
        for (const b of brands) {
          if (!relatedBrands.has(b)) {
            relatedBrands.add(b);
            queue.push(b);
          }
        }
      }
    }
    console.log(405, "relatedBrands ", relatedBrands);

    return relatedBrands;
  };

  // Create a map to track brand relationships
  const brandMap = new Map<string, Set<string>>();

  // Add brand relationships to the map initially
  // after set brandMap then we will be able to use getRelatedBrands
  brandConnections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
    const brand1 = manufacturer_p1.toLowerCase();
    const brands2 = manufacturers_p2.toLowerCase();
    const brand2Array = brands2.split(";").map((b) => b.trim());
    // Add the current brand to the map
    if (!brandMap.has(brand1)) {
      brandMap.set(brand1, new Set());
    }
    // Add the related brands to the map
    brand2Array.forEach((brand2) => {
      if (!brandMap.has(brand2)) {
        brandMap.set(brand2, new Set());
      }
      // Add the relationship to the map
      brandMap.get(brand1)!.add(brand2);
      // Add the reverse relationship to the map
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

  // console.log({ flatMap });
  // Map(2867) {
  //   '112' => Set(1) { '112' },
  //   '3chenes' => Set(4) {
  //     '3c pharma laboratoires',
  //     'les 3 chenes',
  //     '3chenes',
  //     'color&soin'
  //   },
  //   '3c pharma laboratoires' => Set(4) {
  //     '3chenes',
  //     '3c pharma laboratoires',
  //     'les 3 chenes',
  //     'color&soin'
  //   },

  flatMap.forEach((relatedBrands, brand) => {
    flatMapObject[brand] = Array.from(relatedBrands);
  });
  console.log({ flatMapObject });
  // {
  //   '112': [ '112' ],
  //   '911': [ '911' ],
  //   '3chenes': [
  //     '3c pharma laboratoires',
  //     'les 3 chenes',
  //     '3chenes',
  //     'color&soin'
  //   ],
  //   '3c pharma laboratoires': [
  //     '3chenes',
  //     '3c pharma laboratoires',
  //     'les 3 chenes',
  //     'color&soin'
  //   ],
  //   'les 3 chenes': [
  //     '3chenes',
  //     'color&soin',
  //     'les 3 chenes',
  //     '3c pharma laboratoires'
  //   ],
  // }

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

  const brandsMapping = await getBrandsMapping();
  // {
  //   '112': [ '112' ],
  //   '911': [ '911' ],
  //   '3chenes': [
  //     '3c pharma laboratoires',
  //     'les 3 chenes',
  //     '3chenes',
  //     'color&soin'
  //   ],
  //   '3c pharma laboratoires': [
  //     '3chenes',
  //     '3c pharma laboratoires',
  //     'les 3 chenes',
  //     'color&soin'
  //   ],
  // }

  const versionKey = "assignBrandIfKnown";
  let products = await getPharmacyItems(countryCode, source, versionKey, false);
  let counter = 0;
  let counterExisting = 0;
  let obj: any = {};
  let arr: any = [];
  for (let product of products) {
    counter++;

    if (product.m_id) {
      counterExisting++;
      // Already exists in the mapping table, probably no need to update
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
          matchedBrands.push(brand);
        }
      }
    }
    arr.push(matchedBrands);
    console.log(`${product.title} -> ${_.uniq(matchedBrands)}`);
    const sourceId = product.source_id;
    const meta = { matchedBrands };
    const brand = matchedBrands.length ? matchedBrands[0] : null;

    const key = `${source}_${countryCode}_${sourceId}`;
    const uuid = stringToHash(key);

    // Update pharmacy_mapping table
    // obj[key] = { uuid, source, sourceId, countryCode, brand, matchedBrands };
    // await updatePharmacyMapping(key, uuid, source, sourceId, countryCode, brand, meta, job, context);

    // Then brand is inserted into product mapping table
  }

  if (products.length == counter) {
    console.log("100 All items processed ", counter);
    console.log("101 All items counterExisting ", counterExisting);
  }

  console.table(obj);
  console.log("Meta Table");
  console.log("%j", arr);
}

// modify

const areSame = (str1: string, str2: string) => {
  // ignore for  HAPPY
  return str1.localeCompare(str2, undefined, { sensitivity: "base" }) === 0;
};
// ignore BIO, NEB

const areSimilar = (str1: string) => {
  if (str1.includes("BIO") || str1.includes("NEB")) {
    return false;
  }
  return true;
  // return str1.includes("HAPPY");
};
//  RICH, RFF, flex, ultra, gum, beauty, orto, free, 112, kin, happy has to be in the front

const areDifferent = (input: string) => {
  const requiredBrands = [
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
  ];
  const pattern = new RegExp(`^(happy|${requiredBrands.join("|")})\\b`, "i");

  // Test function

  if (input.startsWith("happy")) return true; // Case-sensitive check for "happy"
  return pattern.test(input);
};

// fronOrSecound word

const fronOrSecound = (input: string) => {
  const requiredWords = ["heel", "contour", "nero", "rsv"];
  const pattern = new RegExp(
    `^(\\b${requiredWords.join("\\b|\\b")}\\b|\\S+\\s+\\b${requiredWords.join(
      "\\b|\\b"
    )}\\b)`,
    "i"
  );

  // Test function
  const checkPosition = (input) => pattern.test(input);

  if (checkPosition(input)) return true;
  return false;
};

//  if >1 brands matched, prioritize matching beginning

const prioritizeBeginning = (input: any) => {
  const requiredBrands = [
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
  ];
  const brandRegex = new RegExp(`\\b(${requiredBrands.join("|")})\\b`, "gi"); // Case-insensitive except for "happy"

  // Function to prioritize first occurrence
  // const prioritizeMatchAtStart = (input) => {
  const matches = input.match(brandRegex) || []; // Find all matches

  if (matches.length === 0) return null; // No match

  // Check if any match is at the beginning
  const firstWord = input.split(/\s+/)[0]; // Get the first word
  if (matches.includes(firstWord)) return firstWord; // Prioritize first-word match

  return matches[0]; // Otherwise, return the first detected match
  // };
};

// HAPPY needs to be matched capitalized

// const matchCapitalized = (input: string) => {
//   const pattern = new RegExp("\\bHAPPY\\b", "i");
//   return pattern.test(input);
// };

const matchCapitalized = (input: any) => {
  const requiredBrands = [
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
  ];
  const brandRegex = new RegExp(`\\b(${requiredBrands.join("|")})\\b`, "gi"); // Case-insensitive for all except "HAPPY"

  const matches = input.match(brandRegex) || []; // Find all case-insensitive matches
  const happyMatch = input.includes("HAPPY") ? "HAPPY" : null; // Ensure "HAPPY" is matched exactly

  // Prioritize beginning match
  const firstWord = input.split(/\s+/)[0]; // Get first word
  if (matches.includes(firstWord)) return firstWord; // Return if it's at the beginning
  if (happyMatch && input.startsWith("HAPPY")) return "HAPPY"; // Ensure HAPPY is prioritized if at the start

  return happyMatch || matches[0] || null; // Prioritize HAPPY if found, else first match
};
