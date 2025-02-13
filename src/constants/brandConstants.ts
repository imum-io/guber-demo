// Brands that must remain uppercase.
export const SPECIAL_BRANDS = new Set(["HAPPY"]);

// Brands to ignore.
export const IGNORE_BRANDS = new Set(["bio", "neb"]);

// Brands that must be the first word in the title.
export const FRONT_BRANDS = new Set([
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

// Brands that must be the first or second word in the title.
export const FRONT_OR_SECOND_BRANDS = new Set([
  "heel",
  "contour",
  "nero",
  "rsv",
]);
