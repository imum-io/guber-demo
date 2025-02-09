import { promises as fs } from "fs";
import * as path from "path";

type BrandsMapping = Record<string, string[]>;

async function checkForDuplicateKeys() {
  try {
    // Load the JSON file containing normalizedBrandsMapping
    const filePath = path.join(__dirname, "data/normalizedBrandsMapping.json");

    // Read the file content asynchronously
    const data = await fs.readFile(filePath, "utf-8");

    // Parse the JSON content
    const brandsMapping: BrandsMapping = JSON.parse(data);

    // Extract keys (canonical brand names)
    const keys = Object.keys(brandsMapping);

    // Check for duplicates by converting keys into a Set and comparing lengths
    const uniqueKeys = new Set(keys);

    if (keys.length !== uniqueKeys.size) {
      console.error("❌ Duplicate keys found in normalizedBrandsMapping.json!");
    } else {
      console.log("✅ No duplicate keys found.");
    }
  } catch (err) {
    console.error("❌ Error reading or parsing file:", err);
  }
}

// Run the duplicate check
checkForDuplicateKeys();
