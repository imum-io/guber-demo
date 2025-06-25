import { MUST_BE_AT_FRONT, MUST_BE_FIRST_OR_SECOND, IGNORED_BRANDS } from "./constants";

export function checkBrandIsValidMatch(title: string, brand: string): boolean {
  const brandLower = brand.toLowerCase();
  if (IGNORED_BRANDS.includes(brandLower)) return false;

  if (brandLower === "happy" && !/\bHAPPY\b/.test(title)) return false;

  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  if (!regex.test(title)) return false;

  const words = title.split(/\s+/);
  if (MUST_BE_AT_FRONT.includes(brandLower)) return words[0].toLowerCase() === brandLower;
  if (MUST_BE_FIRST_OR_SECOND.includes(brandLower)) {
    return words.slice(0, 2).some(w => w.toLowerCase() === brandLower);
  }

  return true;
}

export function extractValidBrand(title: string, mapping: Record<string, string[]>): string | null {
  const matches = new Set<string>();

  for (const group of Object.values(mapping)) {
    for (const brand of group) {
      if (checkBrandIsValidMatch(title, brand)) {
        matches.add(brand);
        break; // One match per group
      }
    }
  }

  if (matches.size > 1) {
    return Array.from(matches).sort((a, b) => title.indexOf(a) - title.indexOf(b))[0];
  }

  return matches.size ? Array.from(matches)[0] : null;
}
