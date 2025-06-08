import { 
    checkBrandIsSeparateTerm,
    _processProductBrands // Assuming this will be exported for testing from brands.ts
} from './brands'; 

type BrandsMapping = { [key: string]: string[] };
type ContextType = any; // Define more specifically if known, for now 'any'

jest.mock('./brands', () => {
    const originalModule = jest.requireActual('./brands');
    return {
        ...originalModule,
        getBrandsMapping: jest.fn(), 
        getPharmacyItems: jest.fn(), 
    };
});


describe('checkBrandIsSeparateTerm', () => {
    test('should handle NFKD normalization correctly', () => {
        expect(checkBrandIsSeparateTerm("Babē item", "Babe")).toBe(true);
        expect(checkBrandIsSeparateTerm("Babe item", "Babē")).toBe(true);
        expect(checkBrandIsSeparateTerm("Café Product", "Cafe")).toBe(true);
    });

    test('should handle NFKD normalization with existing regex logic', () => {
        expect(checkBrandIsSeparateTerm("Product Babē Name", "Babe")).toBe(true);
        expect(checkBrandIsSeparateTerm("Babē Product Name", "Babe")).toBe(true);
        expect(checkBrandIsSeparateTerm("Product Name Babē", "Babe")).toBe(true);
        expect(checkBrandIsSeparateTerm("Product Babē", "Babe")).toBe(true);
        expect(checkBrandIsSeparateTerm("Babē", "Babe")).toBe(true);
    });

    test('should return false for non-separate terms or non-matching terms', () => {
        expect(checkBrandIsSeparateTerm("ProductBabeName", "Babe")).toBe(false);
        expect(checkBrandIsSeparateTerm("Product BabēName", "Babe")).toBe(false);
        expect(checkBrandIsSeparateTerm("ProductBabe Name", "Babe")).toBe(false);
        expect(checkBrandIsSeparateTerm("Product Xabe Name", "Babe")).toBe(false);
        expect(checkBrandIsSeparateTerm("Product Bab Name", "Babe")).toBe(false);
    });

    test('should handle punctuation correctly', () => {
        expect(checkBrandIsSeparateTerm("Babē, item", "Babe")).toBe(true); // Regex `\b` handles punctuation
        expect(checkBrandIsSeparateTerm("Item with Babē.", "Babe")).toBe(true); // Regex `\b` handles punctuation
    });
});

describe('processProductBrands (Core Logic)', () => {
    const mockContext: ContextType = { scope: "testProcessProductBrands" };

    // Test cases adapted from the previous assignBrandIfKnown tests
    test('Diacritic Normalization: should match "Babē Cream" with "Babe"', () => {
        const title = "Babē Cream";
        const mapping: BrandsMapping = { "Babe": ["Babe"] }; // This is the filteredBrandsMapping
        expect(_processProductBrands(title, mapping, mockContext)).toBe("Babe");
    });

    test('Ignoring Brands: BIO Product (BIO key/brand already filtered out by caller)', () => {
        const title = "BIO Product BrandX"; // Assume BrandX is a valid brand
        // filteredBrandsMapping would not contain "BIO" as a key or in its related brand lists.
        const filteredMapping: BrandsMapping = { "BrandX": ["BrandX"] };
        expect(_processProductBrands(title, filteredMapping, mockContext)).toBe("BrandX");
    });
    
    test('Ignoring Brands: NEB Cleanser (NEB key/brand already filtered out by caller)', () => {
        const title = "NEB Cleanser BrandY";
        const filteredMapping: BrandsMapping = { "BrandY": ["BrandY"] };
        expect(_processProductBrands(title, filteredMapping, mockContext)).toBe("BrandY");
    });

    test('"HAPPY" Capitalization Rule: "HAPPY Face Wash" should match "HAPPY"', () => {
        const title = "HAPPY Face Wash";
        const mapping: BrandsMapping = { "HAPPY": ["HAPPY"] };
        expect(_processProductBrands(title, mapping, mockContext)).toBe("HAPPY");
    });

    test('"HAPPY" Capitalization Rule: "Happy Face Wash" should not match "HAPPY"', () => {
        const title = "Happy Face Wash";
        const mapping: BrandsMapping = { "HAPPY": ["HAPPY"] };
        expect(_processProductBrands(title, mapping, mockContext)).toBeNull();
    });
    
    test('"HAPPY" rule combined with prefix: "HAPPY Super Drink" (happy is STARTS_WITH_KEYWORD)', () => {
        const title = "HAPPY Super Drink"; // tokenized: ["happy", "super", "drink"]
        const mapping: BrandsMapping = { "HAPPY": ["HAPPY"] };
        // "happy" is STARTS_WITH_KEYWORD. Cap rule passes. Prefix rule (token[0]=="happy") passes.
        expect(_processProductBrands(title, mapping, mockContext)).toBe("HAPPY");
    });

    test('"HAPPY" rule combined with prefix: "Super HAPPY Drink" (happy is STARTS_WITH_KEYWORD but not at start)', () => {
        const title = "Super HAPPY Drink"; // tokenized: ["super", "happy", "drink"]
        const mapping: BrandsMapping = { "HAPPY": ["HAPPY"] };
        // "happy" is STARTS_WITH_KEYWORD. Cap rule passes. Prefix rule (token[0]=="happy") FAILS. So "HAPPY" is skipped.
        expect(_processProductBrands(title, mapping, mockContext)).toBeNull();
    });


    test('Prefix Rules (startsWithKeywords): "RICH Cream" should match "RICH"', () => {
        const title = "RICH Cream";
        const mapping: BrandsMapping = { "RICH": ["RICH"] };
        expect(_processProductBrands(title, mapping, mockContext)).toBe("RICH");
    });

    test('Prefix Rules (startsWithKeywords): "Another RICH Cream" should not match "RICH"', () => {
        const title = "Another RICH Cream";
        const mapping: BrandsMapping = { "RICH": ["RICH"] };
        expect(_processProductBrands(title, mapping, mockContext)).toBeNull();
    });
    
    test('Prefix Rules (startsWithKeywords): "Ultra fine powder" should match "Ultra"', () => {
        const title = "Ultra fine powder";
        const mapping: BrandsMapping = { "Ultra": ["Ultra"] };
        expect(_processProductBrands(title, mapping, mockContext)).toBe("Ultra");
    });

    test('Prefix Rules (startOrSecondWordKeywords): "Heel Support" should match "Heel" (1st word)', () => {
        const title = "Heel Support";
        const mapping: BrandsMapping = { "Heel": ["Heel"] };
        expect(_processProductBrands(title, mapping, mockContext)).toBe("Heel");
    });

    test('Prefix Rules (startOrSecondWordKeywords): "Good Heel Support" should match "Heel" (2nd word)', () => {
        const title = "Good Heel Support";
        const mapping: BrandsMapping = { "Heel": ["Heel"] };
        expect(_processProductBrands(title, mapping, mockContext)).toBe("Heel");
    });

    test('Prefix Rules (startOrSecondWordKeywords): "Very Good Heel Support" should not match "Heel" (3rd word)', () => {
        const title = "Very Good Heel Support";
        const mapping: BrandsMapping = { "Heel": ["Heel"] };
        expect(_processProductBrands(title, mapping, mockContext)).toBeNull();
    });

    test('Prioritization - Beginning of String: "Nero Contour Powder" should match "Nero"', () => {
        const title = "Nero Contour Powder"; // Nero (token 0, index 0), Contour (token 1, index 5)
        const mapping: BrandsMapping = { "Nero": ["Nero"], "Contour": ["Contour"] };
        expect(_processProductBrands(title, mapping, mockContext)).toBe("Nero");
    });

    test('Prioritization - Longest Match: "Flex Seal Pro" (both start at 0)', () => {
        const title = "Flex Seal Pro";
        const mapping: BrandsMapping = { "Flex": ["Flex"], "Flex Seal": ["Flex Seal"] };
        expect(_processProductBrands(title, mapping, mockContext)).toBe("Flex Seal");
    });
    
    test('Prioritization - Longest Match (diacritic): "Babē Seal Pro" with "Babē" and "Babē Seal"', () => {
        const title = "Babē Seal Pro";
        const mapping: BrandsMapping = { "Babē": ["Babē"], "Babē Seal": ["Babē Seal"] };
        expect(_processProductBrands(title, mapping, mockContext)).toBe("Babē Seal");
    });

    test('Combination of Rules: "Happy RICH Supplement" (Happy not HAPPY) should be No brand matched', () => {
        const title = "Happy RICH Supplement";
        const mapping: BrandsMapping = { "HAPPY": ["HAPPY"], "RICH": ["RICH"] };
        expect(_processProductBrands(title, mapping, mockContext)).toBeNull();
    });

    test('Combination of Rules: "HAPPY RICH Supplement" (HAPPY is start, RICH is not) should match "HAPPY"', () => {
        const title = "HAPPY RICH Supplement"; 
        // HAPPY: cap rule OK, prefix rule (token[0]=="happy") OK. Match. Index 0.
        // RICH: cap N/A, prefix rule (token[0]!="rich") FAIL. No match.
        const mapping: BrandsMapping = { "HAPPY": ["HAPPY"], "RICH": ["RICH"] };
        expect(_processProductBrands(title, mapping, mockContext)).toBe("HAPPY");
    });

    test('No Match: "Generic Item" should result in No brand matched', () => {
        const title = "Generic Item";
        const mapping: BrandsMapping = { "SpecificBrand": ["SpecificBrand"] };
        expect(_processProductBrands(title, mapping, mockContext)).toBeNull();
    });

    test('Normalization and Tokenization: "BrandXtra    Powder (Special)" should match "BrandXtra"', () => {
        const title = "BrandXtra    Powder (Special)";
        const mapping: BrandsMapping = { "BrandXtra": ["BrandXtra"] };
        expect(_processProductBrands(title, mapping, mockContext)).toBe("BrandXtra");
    });
});

// --- Tests for getBrandsMapping (Runtime Canonicalization) ---
describe('getBrandsMapping', () => {
    beforeEach(() => {
        jest.resetModules(); 
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Simple Group: Zimpli Kids / Baff Bombz resolve to one canonical', async () => {
        const mockConnections = [{ manufacturer_p1: "zimpli kids", manufacturers_p2: "baff-bombz" }];
        jest.doMock('../../brandConnections.json', () => mockConnections, { virtual: true });
        const { getBrandsMapping: actualGetBrandsMapping } = jest.requireActual('./brands');
        
        const mapping = await actualGetBrandsMapping();
        const group = ["zimpli kids", "baff-bombz"].sort();
        const canonical = group[0]; // "baff-bombz"

        expect(mapping["zimpli kids"]).toEqual([canonical]);
        expect(mapping["baff-bombz"]).toEqual([canonical]);
        jest.dontMock('../../brandConnections.json');
    });
});

// --- Tests for _processProductBrands with Canonicalized Input ---
describe('_processProductBrands with Canonicalized Input', () => {
    const mockContext: ContextType = { scope: "testProcessProductBrandsCanonicalInput" };

    test('Title contains canonical brand: should identify the canonical brand', () => {
        const title = "Product with alpha brand";
        const canonicalizedMapping: BrandsMapping = {
            "alpha brand": ["alpha brand"], 
            "brand_y_alias_of_alpha": ["alpha brand"] 
        };
        expect(_processProductBrands(title, canonicalizedMapping, mockContext)).toBe("alpha brand");
    });

    test('Title contains an alias (whose canonical is different): should return null', () => {
        const title = "Product with brand_y_alias_of_alpha";
        const canonicalizedMapping: BrandsMapping = {
            "alpha brand": ["alpha brand"],
            "brand_y_alias_of_alpha": ["alpha brand"] 
        };
        // _processProductBrands searches for "alpha brand" (the canonical value in the map)
        // Since "alpha brand" is not in "Product with brand_y_alias_of_alpha", it returns null.
        expect(_processProductBrands(title, canonicalizedMapping, mockContext)).toBeNull();
    });
});
