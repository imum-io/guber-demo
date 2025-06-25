import { ALIAS_BRAND_FIXES } from "./constants";
import canonicalBrandMap from "../../data/brandsMapping.json";

export function normalizeBrandName(name: string): string {
  const n = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2019’]/g, "'")
    .toLowerCase();
  return ALIAS_BRAND_FIXES[n] || n;
}

export function getCanonicalBrand(brand: string): string {
  const normalized = normalizeBrandName(brand);
  return canonicalBrandMap[normalized] || normalized;
}
