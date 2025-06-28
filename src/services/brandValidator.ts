import { BRAND_RULES } from "../config/constants";
import { ValidationContext } from "../types/brand.type";

export class BrandValidationService {
    private normalizeBrandName(brandName: string): string {
        const lowercased = brandName.toLowerCase().trim();
        return BRAND_RULES.EQUIVALENCES.get(lowercased) || lowercased;
    }

    private shouldExcludeBrand(brandName: string): boolean {
        const normalized = this.normalizeBrandName(brandName);
        return BRAND_RULES.EXCLUDED_TERMS.has(normalized);
    }

    private escapeRegexChars(text: string): string {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private validateCaseSensitivity(context: ValidationContext): boolean {
        const { title, brandToCheck } = context;

        if (BRAND_RULES.CASE_SENSITIVE_BRANDS.has(brandToCheck.toUpperCase())) {
            const exactPattern = new RegExp(`\\b${this.escapeRegexChars(brandToCheck)}\\b`);
            return exactPattern.test(title);
        }

        return true;
    }

    private validatePositionRequirements(context: ValidationContext): boolean {
        const { titleWords, brandToCheck, brandPosition } = context;
        const normalizedBrand = this.normalizeBrandName(brandToCheck);

        if (BRAND_RULES.POSITION_FIRST_ONLY.has(normalizedBrand)) {
            return brandPosition === 0;
        }

        if (BRAND_RULES.POSITION_FIRST_OR_SECOND.has(normalizedBrand)) {
            return brandPosition === 0 || brandPosition === 1;
        }

        return true;
    }

    private validateWordBoundary(title: string, brandName: string): boolean {
        const escapedBrand = this.escapeRegexChars(brandName);
        const wordBoundaryPattern = new RegExp(`\\b${escapedBrand}\\b`, 'i');
        return wordBoundaryPattern.test(title);
    }

    private findBrandPosition(titleWords: string[], brandName: string): number {
        const normalizedBrand = this.normalizeBrandName(brandName);

        return titleWords.findIndex(word =>
            this.normalizeBrandName(word) === normalizedBrand
        );
    }

    validateBrandMatch(productTitle: string, candidateBrand: string): boolean {
        if (this.shouldExcludeBrand(candidateBrand)) {
            return false;
        }

        if (!this.validateWordBoundary(productTitle, candidateBrand)) {
            return false;
        }

        const titleWords = productTitle.split(/\s+/);
        const brandPosition = this.findBrandPosition(titleWords, candidateBrand);

        if (brandPosition === -1) {
            return false;
        }

        const validationContext: ValidationContext = {
            title: productTitle,
            brandToCheck: candidateBrand,
            titleWords,
            brandPosition,
        };

        if (!this.validateCaseSensitivity(validationContext)) {
            return false;
        }

        return this.validatePositionRequirements(validationContext);
    }

    prioritizeMatches(productTitle: string, matchedBrands: string[]): string[] {
        return matchedBrands.sort((brandA, brandB) => {
            const positionA = productTitle.toLowerCase().indexOf(brandA.toLowerCase());
            const positionB = productTitle.toLowerCase().indexOf(brandB.toLowerCase());

            if (positionA !== positionB) {
                return positionA - positionB;
            }

            return brandA.localeCompare(brandB);
        });
    }
}