import { Job } from 'bullmq';
import { BrandMatchingEngine } from './brandMatchingEngine';
import { APIAccessLayer } from '../api/accessLayer';
import { BrandRelationshipMap, ProcessingRecord, ProcessingStatistics } from '../types/brand.type';
import { BrandConnectionService } from './brandConnectionService';
import { countryCodes } from '../config/enums';
import { sources } from '../sites/sources';
import { PROCESSING_CONFIG } from '../config/constants';

export class BrandProcessingOrchestrator {

    private graphService: BrandConnectionService;
    private matchingEngine: BrandMatchingEngine;
    private dataLayer: APIAccessLayer;
    private processingStats: ProcessingStatistics;

    constructor() {
        this.graphService = new BrandConnectionService();
        this.matchingEngine = new BrandMatchingEngine();
        this.dataLayer = new APIAccessLayer();
        this.processingStats = this.initializeStatistics();
    }

    private initializeStatistics(): ProcessingStatistics {
        return {
            totalProcessed: 0,
            successfulMatches: 0,
            skippedItems: 0,
            errorCount: 0,
            processingTimeMs: 0,
        };
    }

    private async prepareBrandRelationships(): Promise<BrandRelationshipMap> {
        const connectionData = await this.dataLayer.fetchBrandConnections();
        return this.graphService.buildRelationshipGraph(connectionData);
    }

    private createProcessingRecord(
        product: any,
        matchingResult: any,
        targetCountry: countryCodes,
        targetSource: sources
    ): ProcessingRecord {
        return {
            uuid: this.dataLayer.createProductMappingId(targetSource, targetCountry, product.source_id),
            sourceIdentifier: product.source_id,
            countryCode: targetCountry,
            source: targetSource,
            assignedBrand: matchingResult.canonicalBrand,
            matchingMetadata: {
                originalMatch: matchingResult.detectedBrand,
                processingRules: matchingResult.appliedRules,
                timestamp: new Date().toISOString(),
                version: this.dataLayer.generateProcessingVersion(),
            },
        };
    }

    private async processSingleBatch(
        productBatch: any[],
        targetCountry: countryCodes,
        targetSource: sources
    ): Promise<ProcessingRecord[]> {
        const mappingRecords: ProcessingRecord[] = [];

        for (const product of productBatch) {
            this.processingStats.totalProcessed++;

            try {
                if (product.m_id) {
                    this.processingStats.skippedItems++;
                    continue;
                }

                const matchingResult = this.matchingEngine.extractOptimalBrand(product.title);

                if (matchingResult.canonicalBrand) {
                    const processingRecord = this.createProcessingRecord(
                        product,
                        matchingResult,
                        targetCountry,
                        targetSource
                    );

                    mappingRecords.push(processingRecord);
                    this.processingStats.successfulMatches++;
                }

            } catch (error) {
                console.error(`Error processing product ${product.source_id}:`, error);
                this.processingStats.errorCount++;
            }
        }

        return mappingRecords;
    }

    private async updateJobProgress(
        backgroundJob: Job | undefined,
        completedBatches: number,
        totalBatches: number
    ): Promise<void> {
        if (backgroundJob) {
            const progressPercentage = Math.round((completedBatches / totalBatches) * 100);
            await backgroundJob.updateProgress(progressPercentage);
        }
    }

    private async processProductsBatch(
        allProducts: any[],
        targetCountry: countryCodes,
        targetSource: sources,
        backgroundJob?: Job
    ): Promise<void> {
        const batchCount = Math.ceil(allProducts.length / PROCESSING_CONFIG.BATCH_SIZE);

        for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
            const batchStart = batchIndex * PROCESSING_CONFIG.BATCH_SIZE;
            const batchEnd = Math.min(batchStart + PROCESSING_CONFIG.BATCH_SIZE, allProducts.length);
            const currentBatch = allProducts.slice(batchStart, batchEnd);

            const batchRecords = await this.processSingleBatch(currentBatch, targetCountry, targetSource);

            if (batchRecords.length > 0) {
                await this.dataLayer.persistBrandMappingBatch(batchRecords);
            }

            await this.updateJobProgress(backgroundJob, batchIndex + 1, batchCount);
        }
    }

    async executeBrandAssignment(
        targetCountry: countryCodes,
        targetSource: sources,
        backgroundJob?: Job
    ): Promise<ProcessingStatistics> {

        const processingStartTime = Date.now();
        try {
            const brandRelationships = await this.prepareBrandRelationships();

            this.matchingEngine.initializeWithRelationships(brandRelationships);

            const productsToProcess = await this.dataLayer.fetchPharmacyProducts(
                targetCountry,
                targetSource,
                this.dataLayer.generateProcessingVersion(),
                false
            );

            await this.processProductsBatch(productsToProcess, targetCountry, targetSource, backgroundJob);

            this.processingStats.processingTimeMs = Date.now() - processingStartTime;
            return this.processingStats;

        } catch (error) {
            console.error('Brand assignment processing failed:', error);
            throw error;
        }
    }

}