import { CheerioAPI } from "cheerio";
// import { isChangedHomeAppliences } from '../../common/homeAppliences-common'
import queryString from "query-string";
import { HomeAppliencesType } from "../../types/items/homeAppliencesItem";
import { getBaseUrl, matchLabelTranslation } from "../../utils";
import { HomeAppliancesInterface } from "../interfaces";
import { SNKTesting } from "./sample";

export class SNKFunctions implements HomeAppliancesInterface {
    public headers = {};
    public useHeadless = true;

    private labelTranslations = {
        brand: {
            lt: "Prekės ženklas",
        },
        model: {
            lt: "Modelis",
        },
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
    };

    public getAdsCount($: CheerioAPI) {
        const pagination = $(".paginator");

        const totalPages = $(".paginator__last > a", pagination).text();

        const totalAds = $(".catalog-taxons-pagination__count > b").last().text();

        return { totalAds: Number(totalAds), totalPages: Number(totalPages) };
    }

    public getNextPageUrl($: CheerioAPI, url?: string): string {
        const noNextPage = $(".ks-inactive.ks-non-clickable.ks-next");
        if (noNextPage.length == 1) {
            return undefined;
        }
        const parsedUrl = queryString.parseUrl(url);
        parsedUrl.query.o = parsedUrl.query.o ? `${Number(parsedUrl.query.o) + 48}` : "48";
        return queryString.stringifyUrl(parsedUrl);
    }

    public addItems($: CheerioAPI, idUrls, url?: string): void {
        const baseUrl = getBaseUrl(url);

        $(".ks-catalog-taxons-product").each((i, element) => {
            const itemUrl = $(element).attr("data-sna-url");
            const sourceId = $(element).attr("data-sna-id");
            idUrls[sourceId] = baseUrl + itemUrl;
        });
    }

    public getSubLinks($: CheerioAPI, url) {
        let subLinkUrls = [];
        $(".new-cat-list .new-cat-item").each((i, element) => {
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
        return Boolean($.statusCode == 404);
    }

    public scrapeHomeAppliancesItem($: CheerioAPI, url: string): HomeAppliencesType<string> {
        let item = {} as HomeAppliencesType<string>;

        item.title = $("h1").text()?.trim();
        item.manufacturer = $(".product-info__manufacturer").text()?.trim();
        item.sourceId = $(".products-comparisons-links__add-link").attr("data-compare-product-id");
        item.productCode = $(".product-id").text()?.split(":")[1]?.trim();
        item.barcode = $("#flix-inpage").find("script").attr("data-flix-ean");
        if (item.barcode == "") {
            item.barcode = null;
        }
        const categories = $(".breadcrumbs.breadcrumbs--collapsed").find("span");

        item.category = $(categories[3]).text()?.trim();
        item.subcategory = $(categories[5]).text()?.trim();
        item.subsubcategory = $(categories[7]).text()?.trim();
        item.subsubsubcategory = $(categories[9]).text()?.trim();

        $(".info-table")
            .find("tr")
            .each((i, element) => {
                const label = $("td", element).first()?.text().trim();
                const value = $("td", element).last()?.text().trim();

                for (let key in this.labelTranslations) {
                    if (matchLabelTranslation(label, this.labelTranslations[key], true)) {
                        if (!item[key]) {
                            if (key == "width" && value.includes("x")) {
                                item.dimensions = value;
                                let subvalues = value.split("x");
                                item.width = subvalues[0];
                                item.height = subvalues[1];
                                item.length = subvalues.length > 1 ? subvalues[2] : undefined;
                            } else {
                                item[key] = value;
                            }
                        }
                    }
                }
            });

        const productPrices = $(".detailed-product-block").first();

        item.price = $(productPrices).find(".price").find("span").first().text();
        if (!item.price) {
            $("script").each((i, elem) => {
                let text = $(elem).html();
                if (text.includes("http://schema.org") || text.includes("https://schema.org")) {
                    let productObject = JSON.parse(text);
                    item.price = productObject?.offers?.price;
                }
            });
        }
        item.memberPrice = $(".product-price-details__loyalty-price")
            .first()
            .find(".product-price-details__price-number")
            .first()
            .text()
            .trim();

        item.finalPrice = item.memberPrice || item.discountPrice || item.price;
        let discountString: string[] = [];

        $(".products-tag-container--product-page .products-tag").each((i, element) => {
            let discountText = $("span.products-tag__text", element)?.text();
            if (discountText) {
                discountString.push(discountText);
            }
        });

        item.discountType = discountString.join("; ") || undefined;

        item.inStock = $(".product-not-sellable-online").length ? false : true;

        item.meta = {};
        item.meta["barcode"] = {
            gtin: $("#videoly-product-gtin").text()?.trim(),
            sku: $("#videoly-product-sku").text()?.trim(),
            ean: item.barcode,
        };
        return item;
    }

    public async testing(autoLunch: boolean) {
        return new SNKTesting(autoLunch);
    }
}
