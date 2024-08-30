"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualLinkIds = exports.imageBuckets = exports.BucketNames = exports.FetchType = exports.searchResultTypes = exports.countryCodes = exports.measurementRegex = exports.quantityRegex = exports.invalidDate = exports.wheelFormulaRegex = exports.cabinRegex = exports.warrantyRegex = exports.secondaryAirConditioningRegex = exports.ADRRegex = exports.retarderIntarderRegex = exports.lowlinerRegex = exports.envs = exports.predictionStatuses = exports.activityTypes = exports.rcEstimatedDealsStatuses = exports.slackChannels = exports.imageStatuses = exports.adLinkStatuses = exports.updateOrAddStatus = exports.queueTypes = exports.jobTypes = exports.activityStatuses = exports.productCategories = exports.productTypes = exports.currentTimeZone = exports.timezones = exports.dbServers = exports.ClientName = exports.ImsimResStatus = exports.EngineType = exports.vehicleTypes = void 0;
// TODO: rename vehicleTypes -> dbModels
exports.vehicleTypes = {
    truck: 'truck',
    trailer: 'trailer',
    car: 'car',
    household: 'household',
    land: 'land',
    likesinfo: 'likesinfo',
    images: 'images',
    rcEstimatedDeals: 'rcEstimatedDeals',
    rcDeal: 'rcDeal',
    rcArdMatch: 'rcArdMatch',
    pharmacy: 'pharmacy',
    pharmacySTB: 'pharmacySTB',
    realestateProject: 'realestateProject',
    adLink: 'adLink',
    link: 'link',
    linkCount: 'linkCount',
    availablity: 'availablity',
    matchingValidation: 'matchingValidation',
    homeAppliances: 'homeAppliances',
    events: 'events',
    aggregator: 'aggregator',
    aggregatorSource: 'aggregatorSource',
    clientProduct: 'clientProduct',
};
var EngineType;
(function (EngineType) {
    EngineType["Title"] = "title";
    EngineType["OCR"] = "ocr";
    EngineType["ImageSearch"] = "imsim";
    EngineType["ManualMatch"] = "manual";
    EngineType["Barcode"] = "barcode";
    EngineType["VAI"] = "vai";
})(EngineType = exports.EngineType || (exports.EngineType = {}));
var ImsimResStatus;
(function (ImsimResStatus) {
    ImsimResStatus["succeessWithoutMatches"] = "succeessWithoutMatches";
    ImsimResStatus["succeessWithMatches"] = "succeessWithMatches";
    ImsimResStatus["error"] = "error";
})(ImsimResStatus = exports.ImsimResStatus || (exports.ImsimResStatus = {}));
var ClientName;
(function (ClientName) {
    ClientName["azt"] = "azt";
    ClientName["tro"] = "tro";
    ClientName["elx"] = "elx";
    ClientName["box"] = "box";
    ClientName["PitchReport"] = "ssp";
})(ClientName = exports.ClientName || (exports.ClientName = {}));
var dbServers;
(function (dbServers) {
    dbServers["cars"] = "cars";
    dbServers["gtest"] = "gtest";
    dbServers["pharmacy"] = "pharmacy";
    dbServers["realestate"] = "realestate";
    dbServers["trucks"] = "trucks";
    dbServers["local"] = "local";
})(dbServers = exports.dbServers || (exports.dbServers = {}));
exports.timezones = {
    lt: 'Europe/Vilnius',
};
exports.currentTimeZone = exports.timezones.lt;
exports.productTypes = {
    sale: 'sale',
    rent: 'rent',
    unknown: 'unknown',
};
exports.productCategories = {
    unknown: 'unknown',
    flat: 'flat',
    house: 'house',
    land: 'land',
    shortterm: 'shortterm',
    lakehouse: 'lakehouse',
    spaces: 'spaces',
    garages: 'garages',
};
exports.activityStatuses = {
    running: 'running',
    finished: 'finished',
};
exports.jobTypes = {
    urlJob: 'Unique URL',
    adJob: 'Ad Job',
    updateAdJob: 'Update Ad Job',
    pageJob: 'Page Job',
    imageStorerJob: 'Image Storer Job',
    imageValidateJob: 'Image Validate Job',
    imageOcrJob: 'Image OCR Job',
    imsimIndexerJob: 'Imsim Indexer Job',
    imsimMatcherJob: 'Imsim Matcher Job',
    reports: {
        carValuationJob: 'Car Valuation Job',
        aggregatorQueueingJob: 'Aggregator Queueing Job',
        aggregatorPitchReportJob: 'Pitch Report Job',
    },
    events: {
        aztReportJob: 'Azeta Report Job',
        troReportJob: 'Trobos Report Job',
        elxReportJob: 'Electrolux Report Job',
        dataCollectionJob: 'Data Collection Job',
        manualMatchJob: 'Manual Match Job',
        fieldAvailabilityJob: 'Field Availability Job',
        barcodeResetSearchJob: 'Barcode Reset & Search Job',
        pharmacyBarcodeJob: 'Pharmacy Barcode Reset & Search Job',
        queueTROJob: 'Queue TRO Job',
    }
};
exports.queueTypes = {
    urlQueue: 'URL List',
    httpQueue: 'HTTP Queue',
    headlessQueue: 'Headless Queue',
    eventQueue: 'Event Queue',
    imageStorerQueue: 'Image Storer Queue',
    pageQueue: 'Page Queue',
    imsimQueue: 'Imsim Queue',
    mitmQueue: 'Mitm Queue',
    valuationQueue: 'Valuation Queue'
};
exports.updateOrAddStatus = {
    new: 'new',
    updated: 'updated',
    removed: 'removed',
    error: 'error',
    unchanged: 'unchanged',
    other: 'other',
};
var adLinkStatuses;
(function (adLinkStatuses) {
    adLinkStatuses["duplicate"] = "duplicate";
    adLinkStatuses["duplicateUpdateAd"] = "duplicateUpdateAd";
    adLinkStatuses["pending"] = "pending";
    adLinkStatuses["queued"] = "queued";
    adLinkStatuses["done"] = "done";
    adLinkStatuses["unknown"] = "unknown";
    adLinkStatuses["error"] = "error";
    adLinkStatuses["other"] = "other";
    adLinkStatuses["removed"] = "removed";
})(adLinkStatuses = exports.adLinkStatuses || (exports.adLinkStatuses = {}));
var imageStatuses;
(function (imageStatuses) {
    imageStatuses["stored"] = "stored";
    imageStatuses["error"] = "error";
    imageStatuses["notFound"] = "not_found";
    imageStatuses["wrongFormat"] = "wrong_format";
    imageStatuses["duplicate"] = "duplicate";
    imageStatuses["pending"] = "pending";
})(imageStatuses = exports.imageStatuses || (exports.imageStatuses = {}));
exports.slackChannels = {
    monitoringReports: 'monitoring-reports',
    pdfLinks: 'pdf-links',
    monitoringDatadogHealthCheck: 'monitoring-datadog-healthchecks'
};
exports.rcEstimatedDealsStatuses = {
    pending: 'pending',
    checked: 'checked',
    splitted: 'splitted',
    download: 'download',
    downloaded: 'downloaded',
    processed: 'processed',
    completed: 'completed',
    error: 'error', // maybe use if XLS processing failed?
};
exports.activityTypes = {
    newScan: 'new_scan',
    validation: 'validation',
    storeImages: 'store_images',
    rcDealsEstimates: 'rc_deals_estimates',
    rcSplitMaxDeals: 'rc_split_max_deals',
    rcDealsOptimisePlan: 'rc_optimise_plan',
    rcDownloadXLS: 'rc_download_xls',
    rcProcessXLS: 'rc_process_xls',
    rcCrossmatchARD: 'rc_crossmatch_ard',
    rcGetEstimatedDeals: 'rc_get_estimated_deals',
    rcUpdateData: 'rc_update_data',
};
exports.predictionStatuses = {
    pending: "pending",
    completed: "completed",
    error: 'error',
};
exports.envs = {
    production: 'PRODUCTION',
    development: 'DEVELOPMENT',
    local: 'LOCAL'
};
// =IF(ISNUMBER(SEARCH("Low";#REF!));"LowLiner";IF(ISNUMBER(SEARCH("Varios";#REF!));"LowLiner";IF(ISNUMBER(SEARCH("Mega";#REF!));"LowLiner";"-")))
exports.lowlinerRegex = /(?:low|lowliner|varios|mega)/i;
// =IF(ISNUMBER(SEARCH("Retard";#REF!));"Retarder";"- ")
// =IF(ISNUMBER(SEARCH("Intar";#REF!));"Intarder";"- ")
exports.retarderIntarderRegex = /(?:retard|intar)/i;
// =IF(ISNUMBER(SEARCH("ADR";#REF!));"ADR";"- ")
exports.ADRRegex = /(?:adr)/i;
// =IF(ISNUMBER(SEARCH("Park";#REF!));"I-ParkCool";IF(ISNUMBER(SEARCH("Cool";#REF!));"I-ParkCool";"- "))
exports.secondaryAirConditioningRegex = /(?:park|cool)/i;
// =IF(ISNUMBER(SEARCH("Garant";#REF!));"Warranty";IF(ISNUMBER(SEARCH("Warrant";#REF!));"Warranty";"- "))
exports.warrantyRegex = /(?:garant|warrant)/i;
// =IF(ISNUMBER(SEARCH("XL";#REF!));"XL";IF(ISNUMBER(SEARCH("Stream";#REF!));"StreamSpace";IF(ISNUMBER(SEARCH("Big";#REF!));"BigSpace";IF(ISNUMBER(SEARCH("Giga";#REF!));"GigaSpace";"-"))))
// TODO: add different mapped value
exports.cabinRegex = /(?:(?<!a)xl|big|stream|giga)/i;
exports.wheelFormulaRegex = /(?:4x2|4x4|6x2|6x4|6x6|8x2|8x4|8x8|10x4)/i;
exports.invalidDate = "Invalid date"; //moment(new Date(value)).format() returns "Invalid date" for invalid value
exports.quantityRegex = /(?:pcs| ml| gm| gab| g)/;
exports.measurementRegex = /[\d ]((?:mm$|cm$|m$|centimeter$|meter$|inch$|kg$|g$|gram$|kilogram$|kW$|W$|kiloWatt$|Watt$))$/i;
var countryCodes;
(function (countryCodes) {
    countryCodes["lt"] = "LT";
    countryCodes["lv"] = "LV";
    countryCodes["ee"] = "EE";
})(countryCodes = exports.countryCodes || (exports.countryCodes = {}));
exports.searchResultTypes = {
    attempted: 'attempted',
    found: 'found',
    badBarcode: 'bad_barcode',
    exists: 'exists',
    foundError: 'found_error'
};
var FetchType;
(function (FetchType) {
    FetchType["Page"] = "Page";
    FetchType["SubLink"] = "SubLink";
    FetchType["Ad"] = "Ad";
})(FetchType = exports.FetchType || (exports.FetchType = {}));
var BucketNames;
(function (BucketNames) {
    BucketNames["HTML"] = "imum_html";
    BucketNames["BackUps"] = "imum_backups";
    BucketNames["Cars"] = "car_evaluations";
    BucketNames["RealEstates"] = "re_evaluations";
})(BucketNames = exports.BucketNames || (exports.BucketNames = {}));
var imageBuckets;
(function (imageBuckets) {
    imageBuckets["pharmacy"] = "guber_pharmacy";
    imageBuckets["property"] = "guber_property";
})(imageBuckets = exports.imageBuckets || (exports.imageBuckets = {}));
exports.manualLinkIds = {
    TRO: '9390',
    TOP: '9391',
    SNK: '9392',
    PGU: '9393',
};
//# sourceMappingURL=enums.js.map