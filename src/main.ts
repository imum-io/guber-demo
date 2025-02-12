// import { sources } from "src"

import { assignBrandIfKnown } from "./common/brands";
import { countryCodes } from "./config/enums";
import { sources } from "./sites/sources";

export async function runTest() {
  await assignBrandIfKnown(countryCodes.lt, sources.APO);
}

runTest();
