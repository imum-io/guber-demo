export type PageResponseTOP = {
    data: Data;
}

type Data = {
    products: Products;
}

type Products = {
    items: Item[];
    total_count: number;
    filters: Filter[];
    __typename: string;
}

type Filter = {
    name: string;
    request_var: string;
    filter_items_count: number;
    default_collapsed: boolean | null;
    filter_items: FilterItem[];
    __typename: string;
}

type FilterItem = {
    label: string;
    value_string: string;
    items_count: number;
    __typename: FilterItemTypename;
}

export enum FilterItemTypename {
    LayerFilterItem = "LayerFilterItem",
}

type Item = {
    __typename: ItemTypename;
    id: number;
    sku: string;
    name: string;
    small_image: string;
    url_key: string;
    eprice: number;
    promo: number;
    online_only: number;
    is_new: number;
    top_spec_1: string;
    top_spec_2: string;
    top_spec_3: string;
    leasing_price: null;
    leasing_special_price: null;
    special_from_date: null;
    special_to_date: null;
    in_departments: InDepartments;
    external_group_id: string;
    main_category_id: string;
    categories: Category[];
    labels: Label[];
    brand: string;
    preorder_info: PreorderInfo;
    stock_status: StockStatus;
    price: Price;
    display_options: DisplayOptions;
    promotion_start_date: null;
    promotion_end_date: null;
    prohibited_delivery_abroad: boolean;
    topo_club_price: number;
    topo_club_leasing_price: null;
}

export enum ItemTypename {
    SimpleProduct = "SimpleProduct",
}

type Category = {
    external_id: null | string;
    id: number;
    __typename: CategoryTypename;
}

export enum CategoryTypename {
    CategoryTree = "CategoryTree",
}

type DisplayOptions = {
    emphasize: boolean;
    __typename: DisplayOptionsTypename;
}

export enum DisplayOptionsTypename {
    DisplayOptions = "DisplayOptions",
}

type InDepartments = {
    codes: string[];
    is_online_only: boolean;
    __typename: InDepartmentsTypename;
}

export enum InDepartmentsTypename {
    DepartmentsInfo = "DepartmentsInfo",
}

type Label = {
    prod_txt: string;
    prod_img: ProdImg;
    prod_pos: number;
    description: string;
    from_date: Date | null;
    to_date: Date | null;
    __typename: LabelTypename;
}

export enum LabelTypename {
    LabelInfo = "LabelInfo",
}

export enum ProdImg {
    MediaAmastyAmlabel1112184X84PxIkonaBPNG = "media/amasty/amlabel/1112184x84px-ikona-B.png",
    MediaAmastyAmlabel21InIki12PNG = "media/amasty/amlabel/21in_iki12.png",
    MediaAmastyAmlabelIspardavimoIconaPNG = "media/amasty/amlabel/Ispardavimo_icona.png",
}

type PreorderInfo = {
    is_preorder_enabled: boolean;
    out_of_stock_category: OutOfStockCategory;
    __typename: PreorderInfoTypename;
}

export enum PreorderInfoTypename {
    PreorderInfo = "PreorderInfo",
}

export enum OutOfStockCategory {
    Išparduota = "Išparduota",
}

type Price = {
    minimalPrice: MinimalPriceClass;
    regularPrice: MinimalPriceClass;
    __typename: PriceTypename;
}

export enum PriceTypename {
    ProductPrices = "ProductPrices",
}

type MinimalPriceClass = {
    amount: Amount;
    adjustments: any[];
    __typename: MinimalPriceTypename;
}

export enum MinimalPriceTypename {
    Price = "Price",
}

type Amount = {
    currency: Currency;
    value: number;
    __typename: AmountTypename;
}

export enum AmountTypename {
    Money = "Money",
}

export enum Currency {
    Eur = "EUR",
}

export enum StockStatus {
    InStock = "IN_STOCK",
}



