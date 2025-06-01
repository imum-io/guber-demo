import { 
    GENERIC_TERMS, 
    FRONT_ONLY_BRANDS, 
    FLEXIBLE_POSITION_BRANDS, 
    CASE_SENSITIVE_BRANDS,
    UNICODE_NORMALIZATIONS,
    VALIDATION_CONFIG
} from './brandValidationConfig';

export function normalizeBrandName(brandName: string, escapeRegex: boolean = false): string {
    let normalized = brandName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    
    UNICODE_NORMALIZATIONS.forEach(({ from, to }) => {
        normalized = normalized.replace(from, to);
    });
    
    normalized = normalized.trim();
    
    if (escapeRegex) {
        normalized = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    return normalized;
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

function validateCaseSensitive(productTitle: string, brand: string): boolean {
    const normalizedBrand = normalizeBrandName(brand)
    
    const caseSensitiveRule = CASE_SENSITIVE_BRANDS.find(
        rule => normalizeBrandName(rule.brand) === normalizedBrand
    )
    
    if (caseSensitiveRule) {
        return productTitle.includes(caseSensitiveRule.requiredCase)
    }
    
    return true
}

function getBrandPosition(text: string, brand: string): number {
    const words = text.toLowerCase().split(/\s+/)
    const normalizedBrand = normalizeBrandName(brand)
    const normalizedText = normalizeBrandName(text)
    
    if (normalizedText.startsWith(normalizedBrand)) {
        const nextCharIndex = normalizedBrand.length
        if (nextCharIndex >= normalizedText.length || /\s/.test(normalizedText.charAt(nextCharIndex))) {
            return 0
        }
    }
    
    for (let i = 0; i < words.length; i++) {
        if (normalizeBrandName(words[i]) === normalizedBrand) {
            return i
        }
    }
    
    return -1
}


function validateBrandPosition(productTitle: string, brand: string, position: number): boolean {
    if (isFrontOnlyBrand(brand) && position !== 0) {
        return false
    }
    
    if (isFlexiblePositionBrand(brand) && position > VALIDATION_CONFIG.MAX_FLEXIBLE_POSITION) {
        return false
    }

    return true
}

export function validateBrandMatch(input: string, brand: string): boolean {
    if (isGenericTerm(brand)) {
        return false
    }
    
    if (!validateCaseSensitive(input, brand)) {
        return false
    }
    
    const position = getBrandPosition(input, brand)
    if (position === -1) {
        return false
    }
    
    if (!validateBrandPosition(input, brand, position)) {
        return false
    }
    
    return true
}

export function prioritizeBrandsByPosition(productTitle: string, matchedBrands: string[]): string[] {
    if (matchedBrands.length <= 1) {
        return matchedBrands
    }
    
    const brandsWithPosition = matchedBrands.map(brand => ({
        brand,
        position: getBrandPosition(productTitle, brand)
    })).filter(item => item.position !== -1)
    
    brandsWithPosition.sort((a, b) => (a.position - b.position));
    
    return brandsWithPosition.map(item => item.brand)
}
