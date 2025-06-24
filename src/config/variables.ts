// Brands to ignore completely
export const ignoreBrands = new Set(["bio", "neb"])

// Brands that must be matched only if at the front
export const frontOnlyBrands = new Set([
    "rich", "rff", "flex", "ultra", "gum", "beauty", "orto", "free", "112", "kin", "happy"
])

// Brands that must be matched only if at front or second word
export const frontOrSecondWordBrands = new Set(["heel", "contour", "nero", "rsv"])

// Brand groups for Task 2: unify assignment to a single canonical brand
export const canonicalBrandMap: Record<string, string> = {
    "baff-bombz": "zimpli kids",
    "zimpli kids": "zimpli kids",
    // Add other groups here as needed
}