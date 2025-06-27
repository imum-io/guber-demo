// import { sources } from "src"
// src/main.ts

import { assignBrandIfKnown } from "./common/brands"
import { countryCodes } from "./config/enums"
import { sources } from "./sites/sources"

export async function runTest() {
    await assignBrandIfKnown(countryCodes.lt, sources.APO)
}

runTest()
