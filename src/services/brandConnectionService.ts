import { BrandConnection, BrandGroup, BrandRelationshipMap } from "../types/brand.type";

export class BrandConnectionService {
    private relationshipGraph = new Map<string, Set<string>>();
    private canonicalMapping = new Map<string, string>();
    private brandGroups = new Map<string, BrandGroup>();

    private parseRelatedBrands(brandString: string): string[] {
        return brandString
            .toLowerCase()
            .split(';')
            .map(brand => brand.trim())
            .filter(brand => brand.length > 0);
    }

    private ensureNodeExists(brandName: string): void {
        if (!this.relationshipGraph.has(brandName)) {
            this.relationshipGraph.set(brandName, new Set<string>());
        }
    }

    private normalizeBrandName(brandName: string): string {
        return brandName.toLowerCase().trim();
    }

    private createBidirectionalLink(brandA: string, brandB: string): void {
        this.relationshipGraph.get(brandA)?.add(brandB);
        this.relationshipGraph.get(brandB)?.add(brandA);
    }

    private convertGraphToMapping(): BrandRelationshipMap {
        const mapping: BrandRelationshipMap = {};

        this.relationshipGraph.forEach((connectedBrands, brandName) => {
            mapping[brandName] = Array.from(connectedBrands);
        });

        return mapping;
    }

    buildRelationshipGraph(connections: BrandConnection[]): BrandRelationshipMap {
        this.relationshipGraph.clear();

        connections.forEach(connection => {
            const primaryBrand = this.normalizeBrandName(connection.manufacturer_p1);
            const relatedBrands = this.parseRelatedBrands(connection.manufacturers_p2);

            this.ensureNodeExists(primaryBrand);

            relatedBrands.forEach(relatedBrand => {
                this.ensureNodeExists(relatedBrand);
                this.createBidirectionalLink(primaryBrand, relatedBrand);
            });
        });

        return this.convertGraphToMapping();
    }
}