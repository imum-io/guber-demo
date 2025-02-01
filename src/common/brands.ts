import { Job } from "bullmq";
import { countryCodes, dbServers, EngineType } from "../config/enums";
import { ContextType } from "../libs/logger";
import { jsonOrStringForDb, jsonOrStringToJson, stringOrNullForDb, stringToHash } from "../utils";
import _ from "lodash";
import { sources } from "../sites/sources";
import items from "./../../pharmacyItems.json";
import connections from "./../../brandConnections.json";
import unidecode from "unidecode";

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
    const brandConnections = connections
    // console.log("===> brandConnections", brandConnections)


    // Step 1: Create a graph representation of brand relationships
    const brandMap = new Map<string, Set<string>>();

    brandConnections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
        // const brand1 = manufacturer_p1.toLowerCase();
        // const brand2 = manufacturers_p2.toLowerCase();
        // const brand2Array = brand2.split(";").map((b) => b.trim().toLowerCase());

        const processText = (text: string): string => {
            return text.split(" ").map(word => word === "HAPPY" ? word : word.toLowerCase()).join(" ");
        };

        const brand1 = processText(manufacturer_p1);
        const brand2 = processText(manufacturers_p2);
        const brand2Array = brand2.split(";").map((b) => processText(b.trim()));


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

    // Step 2: Find connected components and assign a single brand name per group, it is used to keep track of brands that have already been processed. For each unvisited brand, a breadth-first search (BFS) is performed to find all brands in its connected group.
    const visited = new Set<string>();
    const representativeMap = new Map<string, string>();

    const findGroup = (startBrand: string) => {
        const queue = [startBrand];
        const group = new Set<string>();

        while (queue.length > 0) {
            const current = queue.pop()!;
            if (!visited.has(current)) {
                visited.add(current);
                group.add(current);
                brandMap.get(current)?.forEach((neighbor) => {
                    if (!visited.has(neighbor)) {
                        queue.push(neighbor);
                    }
                });
            }
        }

        return group;
    };

    brandMap.forEach((_, brand) => {
        if (!visited.has(brand)) {
            const group = findGroup(brand);
            const representative = [...group].sort()[0]; // Pick lexicographically smallest brand
            group.forEach((b) => representativeMap.set(b, representative));
        }
    });

    // Step 3: Construct final mapping
    const finalMapping: Record<string, string[]> = {};

    representativeMap.forEach((rep, brand) => {
        if (!finalMapping[rep]) {
            finalMapping[rep] = [];
        }
        finalMapping[rep].push(brand);
    });

    // console.log("===>", finalMapping)

    return finalMapping;
}

async function getPharmacyItems(countryCode: countryCodes, source: sources, versionKey: string, mustExist = true) {
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
    const finalProducts = items

    return finalProducts
}

export function removeDiacritics(str: string): string {
    if (typeof str !== "string") {
        return "";
    }
    return unidecode(str);
}

export function checkBrandIsSeparateTerm(input: string, brand: string): boolean {
    // Normalize input and brand
    const normalizedInput = removeDiacritics(input.toLowerCase());
    const normalizedBrand = removeDiacritics(brand.toLowerCase());

    // Ignore specific brands
    const IGNORE_BRANDS = new Set(["bio", "neb"]);
    if (IGNORE_BRANDS.has(normalizedBrand)) {
        // console.log("first", normalizedBrand)
        return false;
    }

    // Ensure specific brands are at the front
    const FRONT_POSITION_BRANDS = new Set([
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
    ]);
    if (FRONT_POSITION_BRANDS.has(normalizedBrand) && !normalizedInput.startsWith(normalizedBrand)) {
        return false;
    }

    // Ensure specific brands are in the front or second position
    const FRONT_OR_SECOND_POSITION_BRANDS = new Set(["heel", "contour", "nero", "rsv"]);
    if (FRONT_OR_SECOND_POSITION_BRANDS.has(normalizedBrand)) {
        const words = normalizedInput.split(" ");
        if (words[0] !== normalizedBrand && words[1] !== normalizedBrand) {
            return false;
        }
    }

    // // Ensure "HAPPY" is matched only when capitalized
    if (brand === "HAPPY" && !input.includes("HAPPY")) {
        return false;
    }

    // Check if the brand is a separate term in the string
    const escapedBrand = normalizedBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const separateTerm = new RegExp(`\\b${escapedBrand}\\b`, "i").test(input);
    // console.log("===>", escapedBrand)

    return separateTerm;
}

export async function assignBrandIfKnown(countryCode: countryCodes, source: sources, job?: Job) {
    const context = { scope: "assignBrandIfKnown" } as ContextType;

    const brandsMapping = await getBrandsMapping();
    // console.log("===>", brandsMapping)
    const versionKey = "assignBrandIfKnown";
    const products = await getPharmacyItems(countryCode, source, versionKey, false);

    for (const product of products) {
        if (product.m_id) {
            continue; // Skip if already mapped
        }

        const matchedBrands = [];
        for (const brandKey in brandsMapping) {
            // console.log("===> ", brandsMapping[brandKey])

            const relatedBrands = brandsMapping[brandKey];
            for (const brand of relatedBrands) {
                if (matchedBrands.includes(brand)) {
                    continue;
                }
                const isBrandMatch = checkBrandIsSeparateTerm(product.title, brand);
                if (isBrandMatch) {
                    matchedBrands.push(brand);
                }
            }
        }

        // Prioritize brands that match at the beginning
        if (matchedBrands.length > 0) {
            const prioritizedBrand = matchedBrands.find((brand) =>
                removeDiacritics(product.title.toLowerCase()).startsWith(removeDiacritics(brand.toLowerCase()))
            );
            const assignedBrand = prioritizedBrand || matchedBrands[0];

            console.log(`${product.title} -> ${assignedBrand}`);
            const sourceId = product.source_id
            const meta = { matchedBrands }
            const brand = matchedBrands.length ? matchedBrands[0] : null

            const key = `${source}_${countryCode}_${sourceId}`
            const uuid = stringToHash(key)
            // TODO: Insert into database
        }
    }
}