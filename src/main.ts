// import { sources } from "src"

import { assignBrandIfKnown } from "./common/brands";
import { countryCodes } from "./config/enums";
import { sources } from "./sites/sources";

export async function runTest() {
  try {
    await assignBrandIfKnown(countryCodes.lt, sources.APO);
    // console.log("OUTPUT: ", JSON.stringify(result, null, 2));
  } catch (error) {
    console.log("error: ", error);
  }
}

runTest();
