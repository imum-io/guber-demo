// import { sources } from "src"

import { assignBrandIfKnown } from "./common/brands";

export async function runTest() {
  await assignBrandIfKnown();
}

runTest();
