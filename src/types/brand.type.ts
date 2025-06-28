import { countryCodes } from "../config/enums";
import { sources } from "../sites/sources";

export interface BrandConnection {
    manufacturer_p1: string;
    manufacturers_p2: string;
}

export interface PharmacyProduct {
    url: string;
    title: string;
    source_id: string;
    manufacturer: string | null;
    m_id: string | null;
    source: string;
    country_code: string;
    meta?: {
        matchedBrands?: string[];
        [key: string]: any;
    };
}

export interface BrandRelationshipMap {
    [brandName: string]: string[];
}

export interface BrandGroup {
    canonicalName: string;
    members: Set<string>;
    groupId: string;
}

export interface MatchingResult {
    detectedBrand: string | null;
    canonicalBrand: string | null;
    confidence: number;
    appliedRules: string[];
}

export interface ProcessingRecord {
    uuid: string;
    sourceIdentifier: string;
    countryCode: countryCodes;
    source: sources;
    assignedBrand: string;
    matchingMetadata: {
        originalMatch: string;
        processingRules: string[];
        timestamp: string;
        version: string;
    };
}

export interface ValidationContext {
    title: string;
    brandToCheck: string;
    titleWords: string[];
    brandPosition: number;
}

export interface ProcessingStatistics {
    totalProcessed: number;
    successfulMatches: number;
    skippedItems: number;
    errorCount: number;
    processingTimeMs: number;
}