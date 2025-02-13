import _ from "lodash";
import {
  SPECIAL_BRANDS,
  IGNORE_BRANDS,
  FRONT_BRANDS,
  FRONT_OR_SECOND_BRANDS,
} from "../constants/brandConstants";

// Removes common diacritics by normalizing the string to NFD and removing the combining marks.
function removeDiacritics(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// normalizeBrand: Keeps certain brands uppercase, removes diacritics, converts to lowercase, strips non-alphanumeric characters.
export function normalizeBrand(brand: string): string {
  if (SPECIAL_BRANDS.has(brand.toUpperCase())) return brand.toUpperCase();
  const withoutDiacritics = removeDiacritics(brand);
  return withoutDiacritics.toLowerCase().replace(/[^\w\s]/g, "");
}

// validateBrandPosition checks if a brand appears in the correct position within a product title.
export function validateBrandPosition(title: string, brand: string): boolean {
  const normalized = normalizeBrand(brand);
  if (IGNORE_BRANDS.has(normalized)) return false;
  const titleWords = title.split(/\s+/).map((word) => normalizeBrand(word));
  if (FRONT_BRANDS.has(normalized) && titleWords[0] !== normalized)
    return false;
  if (
    FRONT_OR_SECOND_BRANDS.has(normalized) &&
    ![0, 1].includes(titleWords.indexOf(normalized))
  )
    return false;
  if (SPECIAL_BRANDS.has(brand.toUpperCase()) && !title.includes(brand))
    return false;
  return true;
}

// findBrandInTitle checks if the brand exists as a separate term in the title using a regex search.
export function findBrandInTitle(title: string, brand: string): boolean {
  const pattern = `\\b${_.escapeRegExp(normalizeBrand(brand))}\\b`;
  const re = new RegExp(pattern, "i");
  return re.test(title);
}
