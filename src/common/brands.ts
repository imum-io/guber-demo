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
import items from "../../assets/pharmacyItems.json";
import connections from "../../assets/brandConnections.json";
import { validator } from "./validator";
import fs from "fs";
import path from "path";

type BrandsMapping = {
    [key: string]: string[];
};

export async function getBrandsMapping(): Promise<BrandsMapping> {
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
    const finalProducts = items;

    return finalProducts;
}

export function checkBrandIsSeparateTerm(
    input: string,
    brand: string
): boolean {
    // Escape any special characters in the brand name for use in a regular expression
    // const normalizeInput = validator.normalizeString(input)
    // const normalizeBrand = validator.normalizeString(brand)
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

function findRepresentativeBrand(brand: string, brandsMapping: BrandsMapping): string {
    for (const group in brandsMapping) {
        if (brandsMapping[group].includes(brand)) {
            return group
        }
    }
    return brand
}

export async function assignBrandIfKnown(
    countryCode: countryCodes,
    source: sources,
    job?: Job
) {
    const context = { scope: "assignBrandIfKnown" } as ContextType;
    const brandsMapping = await getBrandsMapping();
    const versionKey = "assignBrandIfKnown";
    let products = await getPharmacyItems(
        countryCode,
        source,
        versionKey,
        false
    );
    const groupBrandMap = new Map<string, string>();
    let output: {[key:string]:{productTitle:string; brandName:string|null; matchedBrands: string[] }} = {};

    let counter = 0;
    for (let product of products) {
        counter++;

        if (product.m_id) {
            // Already exists in the mapping table, probably no need to update
            continue;
        }

        let matchedBrands = [];
        for (const brandKey in brandsMapping) {
            const relatedBrands = brandsMapping[brandKey];
            for (const brand of relatedBrands) {
                if (matchedBrands.includes(brand)) {
                    continue;
                }
                 // 2. ignore BIO, NEB
                if(validator.ignoringBrand(brand)){
                    continue
                }
                const isBrandMatch = checkBrandIsSeparateTerm(
                    product.title,
                    validator.makeLower(brand)
                );
                const validBrand = validator.prioritizeBrands(brand,product.title)
                if (isBrandMatch && validBrand) {
                    matchedBrands.push(brand);
                }
            }
        }

        //  if >1 brands matched, prioritize matching beginning
        if (matchedBrands.length > 1) {
            matchedBrands.sort(
                (a, b) => product.title?.indexOf(a) - product.title?.indexOf(b)
            );
        }

        let brandName = matchedBrands.length ? matchedBrands[0] : null;

        if (brandName && groupBrandMap.has(brandName)) {
            brandName = groupBrandMap.get(brandName)!; 
        }

        const sourceId = product.source_id;

        output[sourceId] = {
            productTitle: product.title,
            brandName,
            matchedBrands,
        };
    }
    const outputFolder = path.resolve(__dirname, "../../output/");
    const outputFile = "/brandAssignmentMap.json";
    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder);
    }
    fs.writeFileSync(outputFolder + outputFile, JSON.stringify(output));
    console.log(`Brand assignment map saved to ${outputFolder}${outputFile}`);
}
