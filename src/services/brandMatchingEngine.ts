import { BrandRelationshipMap, MatchingResult } from "../types/brand.type";
import { BrandConnectionService } from "./brandConnectionService";
import { BrandValidationService } from "./brandValidator";

export class BrandMatchingEngine {
    private validator: BrandValidationService;
    private graphService: BrandConnectionService;
    private relationshipMap: BrandRelationshipMap = {};

    constructor() {
        this.validator = new BrandValidationService();
        this.graphService = new BrandConnectionService();
    }

    initializeWithRelationships(relationshipMap: BrandRelationshipMap): void {
        this.relationshipMap = relationshipMap;
        this.graphService.establishBrandGroups();
    }

    private basicTextMatch(title: string, brand: string): boolean {
        const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`\\b${escapedBrand}\\b`, 'i');
        return pattern.test(title);
    }

    private filterValidMatches(productTitle: string, candidates: string[]): string[] {
        return candidates.filter(candidate =>
            this.validator.validateBrandMatch(productTitle, candidate)
        );
    }

    private findCandidateMatches(productTitle: string): string[] {
        const candidates = new Set<string>();
        const processedGroups = new Set<string>();

        Object.values(this.relationshipMap).forEach(brandGroup => {
            const groupKey = brandGroup.sort().join('|');

            if (processedGroups.has(groupKey)) {
                return;
            }

            processedGroups.add(groupKey);

            for (const brandVariant of brandGroup) {
                if (this.basicTextMatch(productTitle, brandVariant)) {
                    candidates.add(brandVariant);
                    break;
                }
            }
        });

        return Array.from(candidates);
    }

    private createEmptyResult(): MatchingResult {
        return {
            detectedBrand: null,
            canonicalBrand: null,
            confidence: 0,
            appliedRules: [],
        };
    }

    private calculateConfidence(productTitle: string, matchedBrand: string): number {
        let confidence = 0.8; // Base confidence

        if (productTitle.includes(matchedBrand)) {
            confidence += 0.1;
        }

        const position = productTitle.toLowerCase().indexOf(matchedBrand.toLowerCase());
        const relativePosition = position / productTitle.length;
        confidence += (1 - relativePosition) * 0.1;

        return Math.min(confidence, 1.0);
    }

    private determineAppliedRules(productTitle: string, matchedBrand: string): string[] {
        // TODO: Logic can be determined that which rules were applied based on the matching process
        // For the task purpose lets return a static list of rules that were applied
        const appliedRules: string[] = [];
        appliedRules.push('word_boundary_check');
        appliedRules.push('position_validation');

        return appliedRules;
    }

    extractOptimalBrand(productTitle: string): MatchingResult {
        const candidateMatches = this.findCandidateMatches(productTitle);
        const validMatches = this.filterValidMatches(productTitle, candidateMatches);

        if (validMatches.length === 0) {
            return this.createEmptyResult();
        }

        const prioritizedMatches = this.validator.prioritizeMatches(productTitle, validMatches);
        const selectedBrand = prioritizedMatches[0];
        const canonicalBrand = this.graphService.getCanonicalBrand(selectedBrand);

        return {
            detectedBrand: selectedBrand,
            canonicalBrand,
            confidence: this.calculateConfidence(productTitle, selectedBrand),
            appliedRules: this.determineAppliedRules(productTitle, selectedBrand),
        };
    }

    getMappingStatistics(): { totalBrands: number; totalGroups: number; averageGroupSize: number } {
        const allBrands = new Set<string>();
        const uniqueGroups = new Set<string>();

        Object.values(this.relationshipMap).forEach(group => {
            const groupKey = group.sort().join('|');
            uniqueGroups.add(groupKey);
            group.forEach(brand => allBrands.add(brand));
        });

        return {
            totalBrands: allBrands.size,
            totalGroups: uniqueGroups.size,
            averageGroupSize: allBrands.size / Math.max(uniqueGroups.size, 1),
        };
    }
}