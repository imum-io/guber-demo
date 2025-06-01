export const GENERIC_TERMS = [
    'bio',
    'neb'
]

export const FRONT_ONLY_BRANDS = [
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
    'happy'
]

export const FLEXIBLE_POSITION_BRANDS = [
    'heel',
    'contour',
    'nero',
    'rsv'
]

export const CASE_SENSITIVE_BRANDS = [
    {
        brand: 'happy',
        requiredCase: 'HAPPY'
    }
]

export const UNICODE_NORMALIZATIONS = [
    { from: /[ēėę]/g, to: 'e' },
    { from: /[āą]/g, to: 'a' },
    { from: /[īį]/g, to: 'i' },
    { from: /[ūų]/g, to: 'u' },
    { from: /[ōø]/g, to: 'o' },
    { from: /[ć]/g, to: 'c' },
    { from: /[ń]/g, to: 'n' },
    { from: /[ś]/g, to: 's' },
    { from: /[ź]/g, to: 'z' },
    { from: /[ł]/g, to: 'l' }
]

export const VALIDATION_CONFIG = {
    MAX_FLEXIBLE_POSITION: 1,
    STRICT_CASE_MATCHING: false
}
