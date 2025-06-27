import { APIAccessLayer } from '../api/accessLayer';
import { BrandConnectionService } from '../services/brandConnectionService';
import { BrandMatchingEngine } from '../services/brandMatchingEngine';


export async function findAllDetectedBrands(): Promise<void> {

    try {
        const dataLayer = new APIAccessLayer();
        const graphService = new BrandConnectionService();
        const matchingEngine = new BrandMatchingEngine();

        const connections = await dataLayer.fetchBrandConnections();
        const brandMap = graphService.buildRelationshipGraph(connections);
        matchingEngine.initializeWithRelationships(brandMap);

        const products = await dataLayer.fetchPharmacyProducts('LT' as any, 'APO' as any, 'test', false);

        const detectedBrands = new Set<string>();
        const missingBrands = new Set<string>();

        products.forEach(product => {
            const result = matchingEngine.extractOptimalBrand(product.title);
            if (result.detectedBrand) {
                detectedBrands.add(result.detectedBrand);
                if (!result.canonicalBrand) {
                    missingBrands.add(result.detectedBrand);
                }
            }
        });

        console.log(`Total unique brands detected: ${detectedBrands.size}`);
        console.log(`Brands missing from connections: ${missingBrands.size}`);

        console.log('\nMissing brands (need to add to brandConnections.json):');
        Array.from(missingBrands).sort().forEach(brand => {
            console.log(`"${brand}"`);
        });

        console.log('\n JSON to add to brandConnections.json:');
        const jsonEntries = Array.from(missingBrands).map(brand =>
            `{"manufacturer_p1": "${brand}", "manufacturers_p2": "${brand}"}`
        );
        console.log('[' + jsonEntries.join(',\n') + ']');

    } catch (error) {
        console.error('Brand detection failed:', error);
    }
}