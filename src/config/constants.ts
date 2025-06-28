export const BRAND_RULES = {
    EQUIVALENCES: new Map<string, string>([
        ['babē', 'babe'],
        ['babe', 'babe'],
    ]),

    EXCLUDED_TERMS: new Set<string>([
        'bio',
        'neb',
    ]),

    POSITION_FIRST_ONLY: new Set<string>([
        'rich',
        'rff',
        'flex',
        'ultra',
        'gum',
        'beauty',
        'orto',
        'free',
        '112',
        'kin',
        'happy',
    ]),

    POSITION_FIRST_OR_SECOND: new Set<string>([
        'heel',
        'contour',
        'nero',
        'rsv',
    ]),

    CASE_SENSITIVE_BRANDS: new Set<string>([
        'HAPPY',
    ]),
}

export const PROCESSING_CONFIG = {
    BATCH_SIZE: 100,
    CACHE_TTL_MS: 60 * 60 * 1000,
    MAX_RETRIES: 3,
    VERSION_PREFIX: 'brand_processing_v',
}

export const DATABASE_TABLES = {
    PRODUCT_MAPPING: 'product_mapping',
    BRAND_CONNECTIONS: 'brand_connections',
    BRAND_GROUPS: 'brand_groups',
}

export enum ProcessingStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
}