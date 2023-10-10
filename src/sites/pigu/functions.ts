import { CheerioAPI } from "cheerio";
// import { isChangedHomeAppliences } from '../../common/homeAppliences-common'
import { HomeAppliencesType } from "../../types/items/homeAppliencesItem";
import { getBaseUrl, getNodeText, isValidURL, matchLabelTranslation } from "../../utils";
import { HomeAppliancesInterface } from "../interfaces";
import { PGUTesting } from "./sample";
import { WigdetData } from "./types";

export class PGUFunctions implements HomeAppliancesInterface {
    public headers = {};
    public useHeadless = false;

    private labelTranslations = {
        width: {
            lt: "Plotis",
        },
        height: {
            lt: "Aukštis",
        },
        depth: {
            lt: "Gylis",
        },
        weight: {
            lt: "Svoris",
        },
        color: {
            lt: "Spalva",
        },
        length: {
            lt: "Ilgis",
        },
        power: {
            lt: "Galia",
        },
        dimensions: {
            lt: "Matmenys",
        },
        model: {
            lt: "Gamintojo kodas",
        },
    };

    public getNextPageUrl($: CheerioAPI, url?: string): string {
        const baseUrl = getBaseUrl(url);

        const pagination = $(".pagination_noscript");

        const nextPageUrl = $(".s-is-active", pagination).next()?.attr("href");

        if (nextPageUrl) {
            return baseUrl + nextPageUrl;
        }
    }

    public addItems($: CheerioAPI, idUrls, url?: string): void {
        $("#productListLoader")
            .find(".product-list-item")
            .each((i, element) => {
                if ($(element).attr("widget-data")) {
                    const widgetData: WigdetData = JSON.parse($(element).attr("widget-data"));
                    if (widgetData?.url && widgetData?.productId) {
                        let url = widgetData.url;
                        if (!isValidURL(widgetData.url)) url = getBaseUrl(widgetData.ua) + widgetData.url;
                        idUrls[widgetData.productId] = url;
                    }
                }
            });
    }
    public getSubLinks($: CheerioAPI, url) {
        let subLinkUrls = [];
        $(".category-list .category-list-item-wrap").each((i, element) => {
            let subLink = $(element).find("a").attr("href");
            if (subLink) {
                subLinkUrls.push(subLink);
            }
        });
        return subLinkUrls;
    }
    public isAdModified(currentItem, previousItem): string {
        // return isChangedHomeAppliences(currentItem, previousItem)
        return "";
    }

    public isAdRemoved($): boolean {
        const widgetContainer = $("#productPage").attr("widget-data") || $(".c-product").attr("widget-data");

        if (!widgetContainer) {
            return true;
        }

        return false;
    }

    public scrapeHomeAppliancesItem($: CheerioAPI, url: string): HomeAppliencesType<string> {
        let item = {} as HomeAppliencesType<string>;
        const widgetContainer = $("#productPage").attr("widget-data") || $(".c-product").attr("widget-data");
        const widgetObject = JSON.parse(widgetContainer);
        item.title = $("h1:first").text()?.trim();
        item.sourceId = widgetObject.productId;
        item.manufacturer = $(".product-info__manufacturer").text()?.trim();
        item.brand = getNodeText($(".c-product__brand"));
        item.productCode = widgetObject.productId;
        $("script").each((i, elem) => {
            if ((elem.children[0] as any)?.data.match(/\"productBarcode\":\s*\"(.*?)\",/)?.[1]) {
                item.barcode = (elem.children[0] as any)?.data.match(/\"productBarcode\":\s*\"(.*?)\",/)?.[1];
            }
        });

        const categories = $("#breadCrumbs").find("li");

        if (categories.length > 0) {
            item.category = $(categories[1]).text()?.trim();
            item.subcategory = $(categories[2]).text()?.trim();
            item.subsubcategory = $(categories[3]).text()?.trim();
            item.subsubsubcategory = $(categories[4]).text()?.trim();
        }

        $(".details-table")
            .find("tr")
            .each((i, element) => {
                const label = $("td", element).first()?.text().trim();
                const value = $("td", element).last()?.text().trim();

                for (let key in this.labelTranslations) {
                    if (matchLabelTranslation(label, this.labelTranslations[key], true)) {
                        if (!item[key]) {
                            if (key == "dimensions" && value.includes(`''`)) {
                                item[key] = value.replace(`''`, ` inch`);
                            } else if (key == "dimensions" && value.includes(`'`)) {
                                item[key] = value.replace(`'`, ` feet`);
                            } else {
                                item[key] = value;
                            }
                        }
                    }
                }
            });

        let productPrices: any = JSON.stringify(widgetObject);

        // Widget only holds sell_price, price hidden in JS
        // stringify and extract incase nesting of attribute in object changes
        // scraping with classes not a stable option
        let primaryPrice = productPrices.match(/\"sell_price\":\s*\"(.*?)\",/)?.[1] ?? "0";

        let secondaryPriceEl = $(".c-price.h-price--small", ".c-product__price-box")
            ?.contents()
            .filter((_, el) => el.nodeType === 3)
            .text()
            .trim();

        let secondaryPricefloatEl = $(".c-price.h-price--small sup", ".c-product__price-box")?.contents().text().trim();

        let secondaryPrice: any;
        if (secondaryPriceEl) {
            secondaryPrice = secondaryPriceEl + (secondaryPricefloatEl ? "." + secondaryPricefloatEl : "");
        }

        if (secondaryPrice) {
            item.discountPrice = primaryPrice;
            item.price = secondaryPrice;
        } else {
            item.price = primaryPrice;
        }

        item.finalPrice = primaryPrice;

        item.inStock = Boolean($('div[data-cy="product-page-add-to-cart"]').length);

        item.meta = {};

        return item;
    }

    public async testing(autoLunch: boolean) {
        return new PGUTesting(autoLunch);
    }
}
