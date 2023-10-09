import { CheerioAPI } from 'cheerio'
import { PharmacyInterface } from '../interfaces'
import { ELDTesting } from './sample'
import { PharmacyItem } from '../../types/items/pharmacyItem'
import { IdUrlsType } from '../../types/common'


export class ELDFunctions implements PharmacyInterface {
    
    public useHeadless = false
    public cookies = undefined
    public headers = {
        'Accept-Language': 'en-us',
    }

    public scrapePharmacyItem($: CheerioAPI, id: string): PharmacyItem {
        const item = <PharmacyItem>{}

        // product id is type of string in the website, but we need to convert it to number
        item.id = id as unknown as number

        // Scrape title
        item.title = $('.prd-block_title').text().trim();

        // Scrape prices
        item.price = $('.prd-block_price--actual').text().trim();
        item.discountPrice = $('.prd-block_price--old').text().trim();
        item.discountType = $('.prd-block_price--text').text().trim();

        // Scrape description
        item.description = $('#description_tab').text().trim();

        // Scrape composition
        item.composition = $('#additional_tab2').text().trim();

        // Scrape manufacturer
        item.manufacturer = $('p:contains("Prekės ženklas:")').text().trim()?.replace('Prekės ženklas: ', '');

        // Calculate final price
        item.finalPrice = item.price || item.discountPrice; // Use the discounted price if available
        item.memberPrice = item.discountPrice || item.price; // Use the regular price if discount is not available

        item.barcode = $('span[data-sku]').text().trim();

        // not sure if this is correct
        item.source = 'ELD'

        // as the country is Lithuania, we can hardcode it
        item.countryCode = 'LT'

        item.category = $('ul.breadcrumbs li:nth-child(2) a').text().trim();
        
        item.productUse = $('div.prd-block_description').text().trim();
        
        item.inStock = $('div.store-stock-table > div').length > 0;
        
        const imageUrls: string[] = [];
        $('div.product-previews-carousel a.slick-slide').each((index, element) => {
            const imageUrl = $(element).find('img').attr('data-src') || '';
            imageUrls.push(imageUrl);
        });

        item.imageUrls = imageUrls;

        return item
    }

    public getNextPageUrl($: CheerioAPI): string | null {
        const nextPageLink = $('ul.pagination li.active + li a');
        if (nextPageLink.length > 0) {
            const nextPageUrl = nextPageLink.attr('href');
            return nextPageUrl || null;
        }
        return null;
    }

    public addItems($: CheerioAPI, idUrls: IdUrlsType): void {
        // Select all product cards using the provided class name
        const productCards = $('.prd--style2');        
    
        // Loop through each product card
        productCards.each((index, card) => {
            const cardElement = $(card);
            const productIdInput = cardElement.find('input[name="anid"]');
            const productUrl = cardElement.find('h2.prd-title > a').attr('href');
    
            if (productIdInput.length && productUrl) {
                const productId = productIdInput.attr('value');                
    
                // Check if the product ID already exists in the idUrls object
                if (!idUrls[productId]) {
                    // Add the product ID and URL to the idUrls object
                    idUrls[productId] = productUrl;
                } else {
                    // If the product ID already exists, log a message
                    console.log(`Product with ID ${productId} already exists.`);
                }
            }
        });
    }

    public isAdModified(currentItem: PharmacyItem, previousItem: PharmacyItem): string {
        return JSON.stringify(currentItem) === JSON.stringify(previousItem) ? 'no' : 'yes'
    }

    public isAdRemoved() {
        return false
    }

    public async testing() {
        new ELDTesting();
    }
}
