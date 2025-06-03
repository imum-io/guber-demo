import { CheerioAPI } from "cheerio"

export type measurementKeys = 'height' | 'width' | 'depth' | 'weight' | 'length' | 'power'

export type IdUrlsType = { [id: string]: string }

export type ResponseType = {
    $: any
    resCode: number
    nextPageOptions?: any
    isError?: boolean
    isRemoved?: boolean
    stop?: boolean
    errorStatus?: string
    errorObject?: any
    proxyData?: proxyType
}

export type FetchIdsRes = {
    nextPageUrl: string | undefined
    idUrls: IdUrlsType
    nextPageOptions?: any
    $: CheerioAPI
    resCode: number
}

export type sourceFunctionConfig = {
    headers: any
    useHeadless: boolean
    cookies?: any
    isXmlMode?: boolean
    fetchDomOnly?: boolean
    source?: string;
}

export type proxyType = {
    ip: string
    port: string
    username: string
    password: string
    country: string
    city: string
}

export type ImageInfo = {
    imageName: string,
    imageType?: string,
    imageHeight?: string,
    imageDimensions?: string,
    imageWidth?: string,
}

export type checkUpdateRes = {
    errorMessage?: string,
    sourceBuffer?: Buffer,
    resCode?: number,
    imageInfo: ImageInfo
}
export type fieldCountType = {
    pharmacy?: object,
    truck?: object,
    trailer?: object,
    car?: object,
    household?: object,
    realestateProject?: object,
    homeAppliances?: object,
}
export type AggItem = {
    url: string,
    productId?: string,
    meta?: {
        [any: string]: any
    },
}

export type dbActiveAd = {
    url: string,
    source: string,
    sourceId: string,
    vehicleType: string,
    countryCode: string,
    linkId: string,
}

export const GENERIC_TERMS = ['bio', 'neb']

export const FRONT_ONLY_BRANDS = ['rich', 'rff', 'flex', 'ultra', 'gum', 'beauty', 'orto', 'free', '112', 'kin', 'happy']

export const FLEXIBLE_POSITION_BRANDS = ['heel', 'contour', 'nero', 'rsv']

export const CASE_SENSITIVE_BRANDS = [{ brand: 'happy', requiredCase: 'HAPPY' }]

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

export type TrieNode = {
    children: Map<string, TrieNode>,
    isEndOfWord: boolean,
    brands: Set<string>,
    failureLink?: TrieNode,
    outputLink?: TrieNode,
    depth: number,
}

export type BrandMatch = {
    brand: string,
    startIndex: number,
    endIndex: number,
    wordPosition: number,
}

export enum ruleType {
    GENERIC = 'generic',
    FRONT_ONLY = 'front-only',
    FLEXIBLE = 'flexible',
    CASE_SENSITIVE = 'case-sensitive',
    NORMAL = 'normal',
}

export type BrandRule = {
    type: ruleType,
    priority: number,
    caseSensitiveCheck?: string,
    maxPosition?: number,
}
