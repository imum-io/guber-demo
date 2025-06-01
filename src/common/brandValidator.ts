import { 
    GENERIC_TERMS, 
    FRONT_ONLY_BRANDS, 
    FLEXIBLE_POSITION_BRANDS, 
    CASE_SENSITIVE_BRANDS,
    UNICODE_NORMALIZATIONS,
    VALIDATION_CONFIG
} from "./brandValidationConfig";
import { MatchedBrand } from "../types/common";

export function normalizeBrandName(brandName: string): string {
    let normalized = brandName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    
    UNICODE_NORMALIZATIONS.forEach(({ from, to }) => {
        normalized = normalized.replace(from, to);
    });
    
    return normalized.trim();
}

export function getBrandPositionInProduct(input: string, brand: string, isCaseSensitive: boolean = false): number {
    const normalizedInput = normalizeBrandName(input)
    const normalizedBrand = normalizeBrandName(brand)

    const escapedBrand = normalizedBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    const match = new RegExp(`\\b${escapedBrand}\\b`, isCaseSensitive ? "" : "i").exec(normalizedInput)

    return match ? match.index : -1;
}

function isGenericTerm(brand: string): boolean {
    const normalizedBrand = normalizeBrandName(brand)
    return GENERIC_TERMS.includes(normalizedBrand)
}

function isFrontOnlyBrand(brand: string): boolean {
    const normalizedBrand = normalizeBrandName(brand)
    return FRONT_ONLY_BRANDS.includes(normalizedBrand)
}

function isFlexiblePositionBrand(brand: string): boolean {
    const normalizedBrand = normalizeBrandName(brand)
    return FLEXIBLE_POSITION_BRANDS.includes(normalizedBrand)
}

function validateCaseSensitive(productTitle: string, brand: string): number {
    const normalizedBrand = normalizeBrandName(brand)
    
    const caseSensitiveRule = CASE_SENSITIVE_BRANDS.find(
        rule => normalizeBrandName(rule.brand) === normalizedBrand
    )
    
    if (caseSensitiveRule) {
        const position = getBrandPositionInProduct(productTitle, caseSensitiveRule.requiredCase, true);

        return position
    }
    
    return -1
}

function getWordPositionFromIndex(text: string, charIndex: number): number {  
    if (charIndex <= 0) return charIndex
  
    const textBeforeMatch = text.substring(0, charIndex)
    const words = textBeforeMatch.trim().split(/\s+/).filter(word => word.length > 0)
    
    return words.length
}

function validateBrandPosition(text: string, brand: string, position: number): boolean {
    const wordPosition = getWordPositionFromIndex(text, position)

    if (isFrontOnlyBrand(brand) && wordPosition !== 0) {
        return false
    }
    
    if (isFlexiblePositionBrand(brand) && wordPosition > VALIDATION_CONFIG.MAX_FLEXIBLE_POSITION) {
        return false
    }

    return true
}

export function validateBrandMatch(input: string, brand: string): number {
    if (isGenericTerm(brand)) {
        return -1
    }
    
    const caseSensitivePosition = validateCaseSensitive(input, brand)
    if (caseSensitivePosition !== -1) {
        return caseSensitivePosition
    }
    
    const position = getBrandPositionInProduct(input, brand)
    if (position === -1) {
        return -1
    }

    if (!validateBrandPosition(input, brand, position)) {
        return -1
    }
    
    return position
}

export function prioritizeBrandsByPosition(matchedBrands: MatchedBrand[]): string[] {
    matchedBrands.sort((a, b) => (a.position - b.position));

    return matchedBrands.map(item => item.brand)
}
