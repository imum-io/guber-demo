export type AdResponseTOP = {
    data: Data;
}

type Data = {
    productDetail: ProductDetail;
}

type ProductDetail = {
    items: Item[];
    __typename: string;
}

type Item = {
    __typename: string;
    id: number;
    sku: string;
    name: string;
    special_price: number;
    special_from_date: null;
    special_to_date: null;
    product_brand: number;
    price_range: PriceRange;
    preorder_info: PreorderInfo;
    url_key: string;
    description: Description;
    brand: string;
    manufacturer_code: string;
    barcode: string;
    brand_benefits: any[];
    brand_details: any[];
    brand_added_info: any[];
    brand_downloads: any[];
    external_group_id: string;
    main_category_id: string;
    categories: Category[];
    media_gallery_entries: MediaGalleryEntry[];
    visible_on_front: VisibleOnFront[];
    labels: Label[];
    flixmedia: Flixmedia;
    estoremedia: null;
    sbLeasingProposal: SbLeasingProposal;
    mokilizingasWidgetConfig: MokilizingasWidgetConfig;
    in_departments: InDepartments;
    online_only: number;
    eprice: number;
    is_new: number;
    promo: number;
    supplementable_loyalty_points: number;
    stock_status: string;
    services: Service[];
    shipping_promo: ShippingPromo[];
    top_spec_1: string;
    top_spec_2: string;
    top_spec_3: string;
    small_image: SmallImage;
    product_links: any[];
    meta_title: string;
    meta_keyword: null;
    meta_description: null;
    meta_image: string;
    additional_info: null;
    additional_info_headline: null;
    out_of_stock_info: Info;
    last_item_info: Info;
    promotion_start_date: null;
    promotion_end_date: null;
    prohibited_delivery_abroad: boolean;
    manuals: string;
    topo_club_price: number;
    fairown: Fairown;
}

type Category = {
    id: number;
    external_id: null | string;
    name: string;
    url_key: string;
    enabled: boolean;
    breadcrumbs: Breadcrumb[] | null;
    __typename: string;
}

type Breadcrumb = {
    category_name: string;
    category_url_key: string;
    category_level: number;
    __typename: string;
}

type Description = {
    html: string;
    __typename: string;
}

type Fairown = {
    enabled: boolean;
    __typename: string;
}

type Flixmedia = {
    inPageId: string;
    distributor: string;
    ean: string;
    language: string;
    brand: string;
    mpn: string;
    fallbackLanguage: string;
    __typename: string;
}

type InDepartments = {
    codes: any[];
    last_department_code: null;
    is_last_item: boolean;
    is_online_only: boolean;
    __typename: string;
}

type Label = {
    prod_txt: string;
    prod_img: string;
    prod_pos: number;
    description: string;
    name: string;
    from_date: Date;
    to_date: Date;
    __typename: string;
}

type Info = {
    title: null;
    description: null;
    __typename: string;
}

type MediaGalleryEntry = {
    label: string;
    position: number;
    disabled: boolean;
    file: string;
    media_type: string;
    video_content: null;
    __typename: string;
}

type MokilizingasWidgetConfig = {
    apiKey: string;
    term: string;
    message: null;
    __typename: string;
}

type PreorderInfo = {
    out_of_stock_category: string;
    __typename: string;
    shipping_text: string;
    out_of_stock_title: string;
    out_of_stock_text: string;
}

type PriceRange = {
    maximum_price: MaximumPrice;
    __typename: string;
}

type MaximumPrice = {
    discount: Discount;
    regular_price: Price;
    final_price: Price;
    fixed_product_taxes: any[];
    __typename: string;
}

type Discount = {
    amount_off: number;
    percent_off: number;
    __typename: string;
}

type Price = {
    currency: string;
    value: number;
    __typename: string;
}

type SbLeasingProposal = {
    clientId: string;
    price: string;
    term: string;
    profId: string;
    action: string;
    message: string;
    leasingFirst: boolean;
    __typename: string;
}

type Service = {
    id: number;
    name: string;
    description: string;
    is_promoted: boolean;
    icon: string;
    promoted_option_description: string;
    show_monthly_price: boolean;
    price: null;
    options: Option[];
    __typename: string;
}

type Option = {
    id: number;
    name: string;
    values: Value[];
    __typename: string;
}

type Value = {
    optionId: number;
    title: string;
    price: string;
    is_promoted: boolean;
    old_price: string;
    monthly_price: string;
    months: number;
    is_physical_customers_only: boolean;
    __typename: string;
}

type ShippingPromo = {
    title: string;
    carrier_code: string;
    delivery_time: DeliveryTime;
    price: number;
    __typename: string;
}

type DeliveryTime = {
    from: number;
    to: number;
    __typename: string;
}

type SmallImage = {
    path: string;
    __typename: string;
}

type VisibleOnFront = {
    label: string;
    code: string;
    value: string;
    is_primary: boolean;
    group_name: string;
    __typename: Typename;
}

enum Typename {
    AttributeInfo = "AttributeInfo",
}
