import { Job } from "bullmq";
import _ from "lodash";
import { countryCodes } from "../config/enums";
import { sources } from "../sites/sources";
import { stringToHash } from "../utils";
import items from "../db/pharmacyItems.json";
import connections from "../db/brandConnections.json";

import { createBrandGroups, BrandsMapping } from "./brandGrouper";
import {
  findBrandInTitle,
  normalizeBrand,
  validateBrandPosition,
} from "./brandUtils";

// Function to assign a known brand to a product
export async function assignBrandIfKnown(
  countryCode: countryCodes,
  source: sources,
  job?: Job
) {
  console.time("assignBrandIfKnown");
  try {
    // Build brand groups
    const brandGroups: BrandsMapping = createBrandGroups(connections);

    // Gather all unique brand keys
    const candidateBrands = Object.keys(brandGroups);

    // Construct union regex
    const escapedCandidates = candidateBrands.map((brand) =>
      _.escapeRegExp(normalizeBrand(brand))
    );
    const unionPattern = `\\b(${escapedCandidates.join("|")})\\b`;
    const unionRegex = new RegExp(unionPattern, "gi");

    // Filter products that do NOT have an assigned mapping
    const products = items.filter((p) => !p.m_id);
    console.log(`Processing ${products.length} products`);

    // Process each product
    for (const product of products) {
      const title = product.title.trim();

      // Find all raw matches
      const matches: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = unionRegex.exec(title)) !== null) {
        matches.push(match[1]);
      }

      // Validate each match
      const validated = matches.filter(
        (brand) =>
          findBrandInTitle(title, brand) && validateBrandPosition(title, brand)
      );

      // Sort by earliest occurrence in the title
      validated.sort(
        (a, b) =>
          title.toLowerCase().indexOf(a.toLowerCase()) -
          title.toLowerCase().indexOf(b.toLowerCase())
      );

      // Assign the earliest valid brand
      if (validated.length > 0) {
        const assignedBrand = validated[0];
        console.log(`${title} -> ${assignedBrand}`);

        // Example: Insert/update the product mapping
        const sourceId = product.source_id;
        const meta = { matchedBrands: validated };
        const key = `${source}_${countryCode}_${sourceId}`;
        const uuid = stringToHash(key);

        // TODO: Implement DB logic
        // await insertOrUpdateBrandMapping(uuid, sourceId, assignedBrand, meta);
      }
    }
  } catch (error) {
    console.error("Brand assignment failed:", error);
    throw error;
  }

  console.log("\nExecution Time");
  console.timeEnd("assignBrandIfKnown");
}
