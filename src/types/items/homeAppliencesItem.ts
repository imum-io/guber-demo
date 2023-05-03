export type HomeAppliencesType<T> = {
    id: string
    source?: string
    sourceId?: string
    countryCode?: string
    title: string
    manufacturer: string
    brand: string
    model: string
    timestamp?: string
    price: T
    memberPrice?: T
    discountPrice?: T
    discountType?: string
    finalPrice: T
    productCode?: string
    barcode?: string
    manufacturerCode?: string
    depth?: T
    height?: T
    width?: T
    length?: T
    dimensions?: T
    power?: T
    vehicleType?: string
    category?: string
    subcategory?: string
    internalProductCode?: string
    subsubcategory?: string
    subsubsubcategory?: string
    weight?: T
    color?: string
    meta: string | object
    inStock?: boolean
    extendedUrl?: string
    url: string
}