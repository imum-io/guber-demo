import { BrandConnection, PharmacyProduct, ProcessingRecord } from "../types/brand.type";
import brandConnectionsData from "../../brandConnections.json";
import pharmacyItemsData from "../../pharmacyItems.json";
import { countryCodes } from "../config/enums";
import { sources } from "../sites/sources";
import { PROCESSING_CONFIG } from "../config/constants";
import { stringToHash } from "../utils";

export class APIAccessLayer {
    private brandConnectionsCache: BrandConnection[] | null = null;
    private productCache = new Map<string, PharmacyProduct[]>();

    private buildCacheKey(country: countryCodes, source: sources, excludeProcessed: boolean): string {
        return `${country}_${source}_${excludeProcessed}`;
    }

    async fetchBrandConnections(): Promise<BrandConnection[]> {
        if (this.brandConnectionsCache) {
            return this.brandConnectionsCache;
        }

        // In real implementation, this might be a database or API call
        this.brandConnectionsCache = brandConnectionsData as BrandConnection[];
        return this.brandConnectionsCache;
    }

    async fetchPharmacyProducts(
        targetCountry: countryCodes,
        targetSource: sources,
        processingVersion: string,
        excludeProcessed: boolean = true
    ): Promise<PharmacyProduct[]> {

        const cacheKey = this.buildCacheKey(targetCountry, targetSource, excludeProcessed);

        if (this.productCache.has(cacheKey)) {
            return this.productCache.get(cacheKey)!;
        }

        let filteredProducts = (pharmacyItemsData as PharmacyProduct[]).filter(product =>
            product.country_code === targetCountry && product.source === targetSource
        );

        if (excludeProcessed) {
            filteredProducts = filteredProducts.filter(product => !product.m_id);
        }

        this.productCache.set(cacheKey, filteredProducts);

        // Clear cache after TTL
        setTimeout(() => {
            this.productCache.delete(cacheKey);
        }, PROCESSING_CONFIG.CACHE_TTL_MS);

        return filteredProducts;
    }

    async persistBrandMapping(record: ProcessingRecord): Promise<boolean> {
        try {
            // In real implementation, this would be a database insert
            console.log('Persisting brand mapping:', {
                uuid: record.uuid,
                brand: record.assignedBrand,
                metadata: record.matchingMetadata,
            });

            return true;
        } catch (error) {
            console.error('Failed to persist brand mapping:', error);
            return false;
        }
    }

    async persistBrandMappingBatch(records: ProcessingRecord[]): Promise<{ success: number; failed: number }> {
        let successCount = 0;
        let failedCount = 0;

        for (const record of records) {
            const success = await this.persistBrandMapping(record);
            success ? successCount++ : failedCount++;
        }

        return { success: successCount, failed: failedCount };
    }

    generateProcessingVersion(): string {
        const timestamp = new Date().toISOString().split('T')[0];
        return `${PROCESSING_CONFIG.VERSION_PREFIX}${timestamp}`;
    }

    createProductMappingId(sourceType: sources, countryCode: countryCodes, productSourceId: string): string {
        const identifierString = `${sourceType}_${countryCode}_${productSourceId}`;
        return stringToHash(identifierString);
    }

    async validateDataIntegrity(): Promise<{ isValid: boolean; issues: string[] }> {
        const issues: string[] = [];

        try {
            const connections = await this.fetchBrandConnections();
            if (connections.length === 0) {
                issues.push('No brand connections found');
            }

            const products = pharmacyItemsData as PharmacyProduct[];
            if (products.length === 0) {
                issues.push('No pharmacy products found');
            }

            // Check for required fields
            const missingFields = products.filter(product =>
                !product.title || !product.source_id || !product.source || !product.country_code
            );

            if (missingFields.length > 0) {
                issues.push(`${missingFields.length} products missing required fields`);
            }

        } catch (error) {
            issues.push(`Data validation error: ${error}`);
        }

        return {
            isValid: issues.length === 0,
            issues,
        };
    }

    clearCache(): void {
        this.brandConnectionsCache = null;
        this.productCache.clear();
    }


    // for monitoring and debugging purposes
    getCacheStatistics(): { connectionsCached: boolean; productCacheSize: number } {
        return {
            connectionsCached: this.brandConnectionsCache !== null,
            productCacheSize: this.productCache.size,
        };
    }
}