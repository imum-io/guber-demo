# Brand Matching System

## Overview
I implemented a graph-based approach using connected components algorithm. The key insight was treating brand relationships as a graph where brands are nodes and connections are edges. I then use DFS traversal to find all connected brand groups and assign canonical representatives. This ensures 100% consistency - if brands A, B, C are connected in any way, they all get mapped to the same canonical brand.

## Implemented Functions

### Core Processing
- **`assignBrandIfKnown()`** - Main function that processes pharmacy products and assigns consistent brand names
- **`runTest()`** - Test runner that executes the brand assignment for Lithuanian APO products

### Brand Validation
- **`validateBrandMatch()`** - Validates if a brand matches a product title according to business rules
- **`normalizeBrandName()`** - Normalizes brand names for consistent processing
- **`prioritizeMatches()`** - Determines priority when multiple brands match the same product

### Brand Relationship Management
- **`buildRelationshipGraph()`** - Creates bidirectional brand relationship mapping from connections data
- **`establishBrandGroups()`** - Identifies connected brand groups using graph algorithms
- **`getCanonicalBrand()`** - Returns the canonical representative for any brand variant

### Brand Matching Engine
- **`extractOptimalBrand()`** - Finds and validates the best brand match for a product title
- **`initializeWithRelationships()`** - Initializes the matching engine with brand relationship data
- **`getMappingStatistics()`** - Provides statistics about brand mappings and groups

### Data Access
- **`fetchBrandConnections()`** - Retrieves brand connection data with caching
- **`fetchPharmacyProducts()`** - Gets pharmacy products filtered by country and source
- **`persistBrandMapping()`** - Saves brand mapping records to storage
- **`validateDataIntegrity()`** - Validates data quality before processing

### Orchestration
- **`executeBrandAssignment()`** - Orchestrates the complete brand assignment workflow
- **`processProductsBatch()`** - Processes products in configurable batches for optimal performance


## Business Rules Implemented

- **Brand Equivalents**: Babē = Babe normalization
- **Excluded Terms**: Ignores BIO, NEB during matching
- **Position Rules**: RICH, ULTRA must appear at front; HEEL can be first or second
- **Case Sensitivity**: HAPPY must match exact capitalization
- **Priority Resolution**: Earlier position in title wins when multiple matches
- **Group Consistency**: All related brands assign to same canonical representative

## Running the Application

```bash
yarn start
```

### What Happens When You Run `yarn start`

1. **System Initialization**
   - Loads brand connection data from `brandConnections.json`
   - Loads pharmacy product data from `pharmacyItems.json`
   - Validates data integrity and structure

2. **Brand Relationship Mapping**
   - Builds bidirectional brand relationship graph
   - Creates connected brand groups using graph algorithms
   - Establishes canonical representatives for each brand family

3. **Product Processing**
   - Filters products for Lithuanian APO source
   - Processes products in batches for optimal performance
   - Applies business validation rules to each product title

4. **Brand Matching & Assignment**
   - Extracts potential brand matches from product titles
   - Validates matches against position and case sensitivity rules
   - Resolves conflicts by prioritizing earlier positions
   - Assigns canonical brand names for consistency

5. **Results & Reporting**
   - Saves brand mapping records with metadata
   - Displays success rates and performance metrics
   - Shows total processed, successful matches, and any errors

**Expected Output:**
```
Brand processing completed
Total processed: 3946
Successful matches: 0
Skipped items: 3946
Error count: 0
Processing time: 6 ms
```

## Known Data Issue
### Brand Connections Mismatch
The `brandConnections.json` file doesn't contain the brands that actually appear in the provided pharmacy products. This causes 0 successful matches despite proper brand detection.

To find missing brands: Uncomment `await findAllDetectedBrands();` in the `runTest()` function and run the application. This will output all detected brands that need to be added to `brandConnections.json`.