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