const brandNormalizationMap: Record<string, string> = {
  "Babē": "Babe",
};

const ignoreWords = new Set(["BIO", "NEB"]);
const mustBeAtFront = new Set(["RICH", "RFF", "flex", "ultra", "gum", "beauty", "orto", "free", "112", "kin", "happy"]);
const frontOrSecond = new Set(["heel", "contour", "nero", "rsv"]);
const forceUppercase = new Set(["HAPPY"]);

// Function to normalize a brand name
export function normalizeBrand(brand: string): string {
  let normalized = brandNormalizationMap[brand] || brand;
  
  // Ensure "HAPPY" is always uppercase
  if (forceUppercase.has(normalized.toUpperCase())) {
    normalized = normalized.toUpperCase();
  }

  return normalized;
}

// Function to check if a brand name follows the required word rules
export function isValidBrandName(brand: string): boolean {
  const words = brand.split(/\s+/);

  // Ignore brands that contain words from ignoreWords
  if (words.some(word => ignoreWords.has(word.toUpperCase()))) {
    return false;
  }

  // Ensure words that must be at the front are at the front
  if (words.length > 0 && !mustBeAtFront.has(words[0].toUpperCase())) {
    return false;
  }

  // Ensure words in frontOrSecond are either first or second word
  if (words.length > 1 && !frontOrSecond.has(words[0].toUpperCase()) && !frontOrSecond.has(words[1].toUpperCase())) {
    return false;
  }

  return true;
}





