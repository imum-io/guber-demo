import _ from "lodash";
import unidecode from "unidecode";

const SPECIAL_BRANDS = new Set(["HAPPY"]);
const IGNORE_BRANDS = new Set(["bio", "neb"]);
const FRONT_BRANDS = new Set([
  "rich",
  "rff",
  "flex",
  "ultra",
  "gum",
  "beauty",
  "orto",
  "free",
  "112",
  "kin",
  "happy",
]);
const FRONT_OR_SECOND_BRANDS = new Set(["heel", "contour", "nero", "rsv"]);

/**
 * `normalizeBrand` prepares a brand name for matching by removing diacritics,
 * converting to lowercase (except for special cases), and stripping out
 * non-alphanumeric characters.
 *
 * @param brand The brand name to normalize.
 * @returns The normalized brand name.
 */
export function normalizeBrand(brand: string): string {
  if (SPECIAL_BRANDS.has(brand.toUpperCase())) return brand.toUpperCase();
  return unidecode(brand)
    .toLowerCase()
    .replace(/[^\w\s]/gi, "");
}

/**
 * `validateBrandPosition` checks if a brand is in the correct position within
 * a product title, according to predefined rules.
 *
 * @param title The product title to validate against.
 * @param brand The brand name to check.
 * @returns True if the brand position is valid, false otherwise.
 */
export function validateBrandPosition(title: string, brand: string): boolean {
  // Ignore validation if the brand is in the ignore list.
  if (IGNORE_BRANDS.has(normalizeBrand(brand))) return false;

  // Get array of brand to validate
  const titleWords = title.split(/\s+/).map((word) => normalizeBrand(word));

  // Check position requirements
  if (
    FRONT_BRANDS.has(normalizeBrand(brand)) &&
    titleWords[0] !== normalizeBrand(brand)
  )
    return false;

  if (
    FRONT_OR_SECOND_BRANDS.has(normalizeBrand(brand)) &&
    ![0, 1].includes(titleWords.indexOf(normalizeBrand(brand)))
  )
    return false;

  // Case-sensitive check for HAPPY
  if (SPECIAL_BRANDS.has(brand.toUpperCase()) && !title.includes(brand))
    return false;

  return true;
}

/**
 * `findBrandInTitle` checks if a brand exists within a product title,
 * considering only normalized form for flexibility.
 *
 * @param title The product title to search within.
 * @param brand The brand name to find.
 * @returns True if the brand is found, false otherwise.
 */
export function findBrandInTitle(title: string, brand: string): boolean {
  const normalizedMatch = new RegExp(
    `\\b${_.escapeRegExp(normalizeBrand(brand))}\\b`,
    "i"
  );

  return normalizedMatch.test(title);
}
