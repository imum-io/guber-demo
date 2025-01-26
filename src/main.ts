import { assignBrandIfKnown } from "./common/brands";
import { pharmacyItems } from "./dataLoader";
import * as fs from "fs";
import * as path from "path";

// Function to process pharmacy items and write results to a JSON file
const processPharmacyItems = (): any[] => {
    const results: any[] = [];

    pharmacyItems.forEach((item) => {
        const { matchedBrands } = item.meta;

        if (matchedBrands && matchedBrands.length > 0) {
            // Process and deduplicate matched brands
            const processedBrands = matchedBrands
                .map(assignBrandIfKnown)
                .filter(Boolean); // Remove null values

            // Add processed results to the array
            results.push({
                title: item.title,
                url: item.url,
                processedBrands,
            });
        }
    });

    return results;
};

// Function to write results to a JSON file
const writeResultsToFile = (data: any[]) => {
    const outputFile = path.join(__dirname, "processedResults.json");
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), "utf8");
    console.log(`Results successfully written to ${outputFile}`);
};

// Main execution function
export async function runTest() {
    console.log("Processing pharmacy items...");
    const processedResults = processPharmacyItems();
    writeResultsToFile(processedResults);
    console.log("Processing completed.");
}

// Run the main function
runTest();
