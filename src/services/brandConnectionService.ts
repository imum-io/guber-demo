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

    private traverseComponent(
        currentBrand: string,
        component: Set<string>,
        visitedNodes: Set<string>
    ): void {
        if (visitedNodes.has(currentBrand)) {
            return;
        }

        visitedNodes.add(currentBrand);
        component.add(currentBrand);

        const connectedBrands = this.relationshipGraph.get(currentBrand) || new Set();
        connectedBrands.forEach(connectedBrand => {
            this.traverseComponent(connectedBrand, component, visitedNodes);
        });
    }

    private generateGroupId(): string {
        return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private createBrandGroup(brandMembers: Set<string>): void {
        const sortedMembers = Array.from(brandMembers).sort();
        const canonicalName = sortedMembers[0];
        const groupId = this.generateGroupId();

        const brandGroup: BrandGroup = {
            canonicalName,
            members: brandMembers,
            groupId,
        };

        brandMembers.forEach(member => {
            this.brandGroups.set(member, brandGroup);
            this.canonicalMapping.set(member, canonicalName);
        });
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

    establishBrandGroups(): Map<string, BrandGroup> {
        const visitedNodes = new Set<string>();
        this.brandGroups.clear();
        this.canonicalMapping.clear();

        this.relationshipGraph.forEach((_, brandName) => {
            if (!visitedNodes.has(brandName)) {
                const connectedComponent = new Set<string>();
                this.traverseComponent(brandName, connectedComponent, visitedNodes);
                this.createBrandGroup(connectedComponent);
            }
        });

        return this.brandGroups;
    }

    getCanonicalBrand(brandVariant: string): string | null {
        const normalizedBrand = this.normalizeBrandName(brandVariant);
        return this.canonicalMapping.get(normalizedBrand) || null;
    }
}