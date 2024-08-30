import { assignBrandIfKnown } from "./common/brands";
import { countryCodes } from "./config/enums";
import { sources } from "./sites/sources";

const countryCodeList = [countryCodes.lt, countryCodes.lv, countryCodes.ee];

const sourceList = [
  sources.MDE,
  sources.SLD,
  sources.BNU,
  sources.SNK,
  sources.PGU,
  sources.TOP,
  sources.APO,
];

async function main() {
    try {
        const countryCode: countryCodes = countryCodes.lv;
        const source: sources = sources.MDE;

        await assignBrandIfKnown(countryCode, source);

        console.log("Brand assignment process completed successfully.");
    } catch (error) {
        console.error("An error occurred during the brand assignment process:", error);
    }

    //For All Country Codes and Sources

    // try {
    //     for (const countryCode of countryCodeList) {
    //       for (const source of sourceList) {
    //         console.log(`Processing for Country: ${countryCode}, Source: ${source}`);
    
    //         await assignBrandIfKnown(countryCode, source);
    
    //         console.log(`Completed processing for Country: ${countryCode}, Source: ${source}`);
    //       }
    //     }
    
    //     console.log("Brand assignment process completed successfully for all combinations.");
    //   } catch (error) {
    //     console.error("An error occurred during the brand assignment process:",error);
    //   }
}

main();