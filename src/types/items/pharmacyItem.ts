
/** For Pharmacy Types integration */
export type PharmacyItem<T = string> = {
    id?: number

    added: string

    title: string

    barcode?: string | undefined
    
    manufacturer: string

    productCode?: string

    category: string

    internalProductCode?: string

    price: T

    memberPrice?: T

    discountPrice?: T

    finalPrice?: T

    discountType: string

    productUse: string

    composition: string

    description: string

    inStock: boolean

    form?: string

    url?: string

    sourceId?: string

    quantity?: string

    amountInPackage?: string

    activeSubstance?: string

    activeSubstanceStrength?: string

    other?: string

    additionalInformation: object

    otherParams?: object

    imageUrls?: string[]

    suggestions?: string

    deliveryInfo?: string

    countryCode: 'LT' | 'LV' | 'EE'

    quantityLeft: object

    meta?: string | {
        [any: string]: any
    },

    source?: string
}