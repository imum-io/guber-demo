// import { REProjectItem } from './model'

import { CheerioAPI } from "cheerio";
import { IdUrlsType } from "../types/common";

export interface CommonInterface {
    // required properties
    headers: any;
    useHeadless: boolean;

    // optional properties
    isXmlMode?: boolean;
    cookies?: any;
    isMultipleAd?: boolean;

    // required methods
    getNextPageUrl($: CheerioAPI, url?: string): string | undefined;
    addItems($: CheerioAPI, idUrls: IdUrlsType, url?: string, adLinkMeta?): void;
    /**
     * 
     * @param {object} currentItem currently scraped item
     * @param {object} previousItem fetched from database previous item
     */
    isAdModified(currentItem, previousItem): string;
    isAdRemoved($: CheerioAPI): boolean;
    testing(autoLaunch?: boolean): void

    // optional methods
    supportsType?(vehicleType: string): boolean
    getAdsCount?($: CheerioAPI): { totalAds: number, totalPages: number };
    enrichNewItem?(newAddressInfo, processedItem, dbItem): Promise<void>;
    getNextPageByOptions?(prevPageOptions: any): any;
    hasNextPageByOptions?(url: string): boolean;
    updateUrl?(url: string): string;

    isJson?(vehicleType: string, url: string): boolean;
    getNextPageUrlJson?($: any, url?: string): string | undefined
    addItemsJson?($: any, idUrls: IdUrlsType, url?: string): void;
    isAdRemovedJson?($: any): boolean

    getSubLinks?($: CheerioAPI, url: string): string[];
    supportScrapeList?(vehicleType: string): boolean;
    isSubitemModified?(dbItem, subItem): string;
}

export interface REProjectInterface extends CommonInterface {
    scrapeRealestateProjectItem($: CheerioAPI, url: string, adLinkMeta?): any;
}

export interface HouseholdInterface extends CommonInterface {
    scrapeHouseholdItem($: CheerioAPI, url: string, adLinkMeta?): any;
}

export interface TrailerInterface extends CommonInterface {
    scrapeTrailerItem($: CheerioAPI, url: string, adLinkMeta?): any;
    scrapeTrailerJson?($: any, url: string, adLinkMeta?): any;
}

export interface TruckInterface extends CommonInterface {
    scrapeTruckItem($: CheerioAPI, url: string, adLinkMeta?): any;
    scrapeTruckJson?($: any, url: string, adLinkMeta?): any;
}

export interface CarInterface extends CommonInterface {
    scrapeCarItem($: CheerioAPI, url: string, adLinkMeta?): any;
    scrapeCarJson?($: any, url: string, adLinkMeta?): any;
}

export interface PharmacyInterface extends CommonInterface {
    scrapePharmacyItem($: CheerioAPI, url: string, adLinkMeta?): any;
}

export interface PharmacySTBInterface extends CommonInterface {
    scrapePharmacySTBItem($: CheerioAPI, url: string, adLinkMeta?): any;
}

export interface HomeAppliancesInterface extends CommonInterface {
    scrapeHomeAppliancesItem($: CheerioAPI, url: string, adLinkMeta?): any;
}
export interface AggregatorInterface extends CommonInterface {
    scrapeAggregatorItem($: CheerioAPI, url: string, adLinkMeta?): any;
}