import { Job } from "bullmq";
import { sources } from "../../sites/sources";
import { countryCodes } from "../../config/enums";
import items from "../../data/pharmacyItems.json";
import { stringToHash } from "../../utils";
import { getRawBrandMapping, normalizeBrandMap } from "./graph";
import { extractValidBrand } from "./matcher";
import { getCanonicalBrand } from "./normalizer";
import { BrandsMapping } from "./types";

async function getPharmacyItems(): Promise<any[]> {
  return items;
}

export async function assignBrandIfKnown(countryCode: countryCodes, source: sources, job?: Job) {
  const brandsRaw = await getRawBrandMapping();
  const brandsMapping: BrandsMapping = normalizeBrandMap(brandsRaw);
  const products = await getPharmacyItems();

  for (const product of products) {
    if (product.m_id) continue;

    const title = product.title;
    const matched = extractValidBrand(title, brandsMapping);
    const group = matched ? brandsMapping[matched] : null;
    const canonical = group ? getCanonicalBrand(group[0]) : null;

    const sourceId = product.source_id;
    const uuid = stringToHash(`${source}_${countryCode}_${sourceId}`);

    if (canonical) {
      const record = {
        uuid,
        brand: canonical,
        meta: { matchedBrands: matched }
      };
      console.log("Saving:", record);
      // await saveBrandMapping(record)
    }
  }
}
