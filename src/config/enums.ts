// TODO: rename vehicleTypes -> dbModels
export const vehicleTypes = {
    truck: "truck",
    trailer: "trailer",
    car: "car",
    household: "household",
    land: "land",
    likesinfo: "likesinfo",
    images: "images",
    rcEstimatedDeals: "rcEstimatedDeals",
    rcDeal: "rcDeal",
    rcArdMatch: "rcArdMatch",
    pharmacy: "pharmacy",
    pharmacySTB: "pharmacySTB",
    realestateProject: "realestateProject",
    adLink: "adLink",
    link: "link",
    linkCount: "linkCount",
    availablity: "availablity",
    matchingValidation: "matchingValidation",
    homeAppliances: "homeAppliances",
    events: "events",
    aggregator: "aggregator",
    aggregatorSource: "aggregatorSource",
    clientProduct: "clientProduct",
}

export type dbModels = keyof typeof vehicleTypes

export enum EngineType {
    Title = "title",
    OCR = "ocr",
    ImageSearch = "imsim",
    ManualMatch = "manual",
    Barcode = "barcode",
    VAI = "vai",
}

export enum ImsimResStatus {
    succeessWithoutMatches = "succeessWithoutMatches",
    succeessWithMatches = "succeessWithMatches",
    error = "error",
}

export enum ClientName {
    azt = "azt",
    tro = "tro",
    elx = "elx",
    box = "box",
    PitchReport = "ssp",
}

export enum dbServers {
    cars = "cars",
    gtest = "gtest",
    pharmacy = "pharmacy",
    realestate = "realestate",
    trucks = "trucks",
    local = "local",
}

export const timezones = {
    lt: "Europe/Vilnius",
}

export const currentTimeZone = timezones.lt

export const productTypes = {
    sale: "sale",
    rent: "rent",
    unknown: "unknown",
}

export const productCategories = {
    unknown: "unknown",
    flat: "flat",
    house: "house",
    land: "land",
    shortterm: "shortterm",
    lakehouse: "lakehouse",
    spaces: "spaces",
    garages: "garages",
}

export const activityStatuses = {
    running: "running",
    finished: "finished",
}

export const jobTypes = {
    urlJob: "Unique URL",
    adJob: "Ad Job",
    updateAdJob: "Update Ad Job",
    pageJob: "Page Job",
    imageStorerJob: "Image Storer Job",
    imageValidateJob: "Image Validate Job",
    imageOcrJob: "Image OCR Job",
    imsimIndexerJob: "Imsim Indexer Job",
    imsimMatcherJob: "Imsim Matcher Job",
    reports: {
        carValuationJob: "Car Valuation Job",
        aggregatorQueueingJob: "Aggregator Queueing Job",
        aggregatorPitchReportJob: "Pitch Report Job",
    },
    events: {
        aztReportJob: "Azeta Report Job",
        troReportJob: "Trobos Report Job",
        elxReportJob: "Electrolux Report Job",
        dataCollectionJob: "Data Collection Job",
        manualMatchJob: "Manual Match Job",
        fieldAvailabilityJob: "Field Availability Job",
        barcodeResetSearchJob: "Barcode Reset & Search Job",
        pharmacyBarcodeJob: "Pharmacy Barcode Reset & Search Job",
        queueTROJob: "Queue TRO Job",
    },
}

export const queueTypes = {
    urlQueue: "URL List",
    httpQueue: "HTTP Queue",
    headlessQueue: "Headless Queue",
    eventQueue: "Event Queue",
    imageStorerQueue: "Image Storer Queue",
    pageQueue: "Page Queue",
    imsimQueue: "Imsim Queue",
    mitmQueue: "Mitm Queue",
    valuationQueue: "Valuation Queue",
}

export const updateOrAddStatus = {
    new: "new",
    updated: "updated",
    removed: "removed",
    error: "error",
    unchanged: "unchanged",
    other: "other",
}

export enum adLinkStatuses {
    duplicate = "duplicate",
    duplicateUpdateAd = "duplicateUpdateAd", // temporary
    pending = "pending",
    queued = "queued",
    done = "done",
    unknown = "unknown",
    error = "error",
    other = "other",
    removed = "removed",
}

export enum imageStatuses {
    stored = "stored",
    error = "error",
    notFound = "not_found",
    wrongFormat = "wrong_format",
    duplicate = "duplicate",
    pending = "pending",
}

export const slackChannels = {
    monitoringReports: "monitoring-reports",
    pdfLinks: "pdf-links",
    monitoringDatadogHealthCheck: "monitoring-datadog-healthchecks",
}

export const rcEstimatedDealsStatuses = {
    pending: "pending", // for later optimisations
    checked: "checked", // was optimised, no need to download
    splitted: "splitted",
    download: "download", // optimised, should be downloaded
    downloaded: "downloaded", // XLS file downloaded, filename should exist
    processed: "processed", // XLS files were processed and inserted to DB

    completed: "completed",
    error: "error", // maybe use if XLS processing failed?
}

export const activityTypes = {
    newScan: "new_scan",
    validation: "validation",
    storeImages: "store_images",
    rcDealsEstimates: "rc_deals_estimates",
    rcSplitMaxDeals: "rc_split_max_deals",
    rcDealsOptimisePlan: "rc_optimise_plan",
    rcDownloadXLS: "rc_download_xls",
    rcProcessXLS: "rc_process_xls",
    rcCrossmatchARD: "rc_crossmatch_ard",
    rcGetEstimatedDeals: "rc_get_estimated_deals",
    rcUpdateData: "rc_update_data",
}

export const predictionStatuses = {
    pending: "pending",
    completed: "completed",
    error: "error",
}

export const envs = {
    production: "PRODUCTION",
    development: "DEVELOPMENT",
    local: "LOCAL",
}
// =IF(ISNUMBER(SEARCH("Low";#REF!));"LowLiner";IF(ISNUMBER(SEARCH("Varios";#REF!));"LowLiner";IF(ISNUMBER(SEARCH("Mega";#REF!));"LowLiner";"-")))
export const lowlinerRegex = /(?:low|lowliner|varios|mega)/i
// =IF(ISNUMBER(SEARCH("Retard";#REF!));"Retarder";"- ")
// =IF(ISNUMBER(SEARCH("Intar";#REF!));"Intarder";"- ")
export const retarderIntarderRegex = /(?:retard|intar)/i
// =IF(ISNUMBER(SEARCH("ADR";#REF!));"ADR";"- ")
export const ADRRegex = /(?:adr)/i
// =IF(ISNUMBER(SEARCH("Park";#REF!));"I-ParkCool";IF(ISNUMBER(SEARCH("Cool";#REF!));"I-ParkCool";"- "))
export const secondaryAirConditioningRegex = /(?:park|cool)/i
// =IF(ISNUMBER(SEARCH("Garant";#REF!));"Warranty";IF(ISNUMBER(SEARCH("Warrant";#REF!));"Warranty";"- "))
export const warrantyRegex = /(?:garant|warrant)/i

// =IF(ISNUMBER(SEARCH("XL";#REF!));"XL";IF(ISNUMBER(SEARCH("Stream";#REF!));"StreamSpace";IF(ISNUMBER(SEARCH("Big";#REF!));"BigSpace";IF(ISNUMBER(SEARCH("Giga";#REF!));"GigaSpace";"-"))))
// TODO: add different mapped value
export const cabinRegex = /(?:(?<!a)xl|big|stream|giga)/i

export const wheelFormulaRegex = /(?:4x2|4x4|6x2|6x4|6x6|8x2|8x4|8x8|10x4)/i

export const invalidDate = "Invalid date" //moment(new Date(value)).format() returns "Invalid date" for invalid value

export const quantityRegex = /(?:pcs| ml| gm| gab| g)/

export const measurementRegex =
    /[\d ]((?:mm$|cm$|m$|centimeter$|meter$|inch$|kg$|g$|gram$|kilogram$|kW$|W$|kiloWatt$|Watt$))$/i

export enum countryCodes {
    lt = "LT",
    lv = "LV",
    ee = "EE",
}

export const searchResultTypes = {
    attempted: "attempted",
    found: "found",
    badBarcode: "bad_barcode",
    exists: "exists",
    foundError: "found_error",
}

export enum FetchType {
    Page = "Page",
    SubLink = "SubLink",
    Ad = "Ad",
}

export const manualLinkIds = {
    TRO: "9390",
    TOP: "9391",
    SNK: "9392",
    PGU: "9393",
}
