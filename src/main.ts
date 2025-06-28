// import { sources } from "src"
// src/main.ts

import { assignBrandIfKnown } from "./common/brands"
import { countryCodes } from "./config/enums"
import { findAllDetectedBrands } from "./customTest/test";
import { sources } from "./sites/sources"

export async function runTest() {
    // brandConnections.json file doesn't contain the brands that actually appear in provided pharmacy products. Thats why the data is not being processed and skipping all products.

    // console.log('Starting comprehensive debugging...\n');
    // await findAllDetectedBrands();
    // console.log('\n' + '='.repeat(50) + '\n');

    console.log('Running full brand assignment...\n');
    await assignBrandIfKnown(countryCodes.lt, sources.APO)
}

runTest()
