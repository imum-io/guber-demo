import { UNICODE_NORMALIZATIONS } from "../types/common"

export function normalizeBrand(brandName: string): string {
    let normalized = brandName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
    
    UNICODE_NORMALIZATIONS.forEach(({ from, to }) => {
        normalized = normalized.replace(from, to)
    })
    
    return normalized.trim()
}