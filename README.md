# Guber Brand Matching

This project provides a sophisticated brand matching system that helps identify and normalize brand names in product titles. It handles various edge cases and ensures consistent brand assignments across related brand groups.

## Features

### Core Features
- Advanced brand name matching with edge case handling
- Support for brand name variations and special characters
- Consistent brand assignment across brand groups
- Detailed logging and error handling
- Statistics tracking and analysis
- Results output in JSON format

### Enhanced Capabilities
- Fuzzy matching with configurable similarity threshold
- Comprehensive analysis reporting
- Brand frequency analysis
- Unmatched item analysis
- Potential new brand suggestions
- Match pattern detection

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create your .env file:
```bash
cp .env.example .env
```

3. Configure your environment variables in .env as needed.

## Usage

To run the brand matching process:

```bash
npm run brand-match
```

This will:
1. Process all items in pharmacyItems.json
2. Apply brand matching rules and validations
3. Generate a results file (brand-matching-results.json)
4. Display processing statistics

### Input Files

- `pharmacyItems.json`: Contains the items to process
- `brandConnections.json`: Contains brand relationship data
- `brandsMapping.json`: Contains brand mapping configurations

### Output

The process generates a `brand-matching-results.json` file containing:
- Assigned brands
- Matched brands
- Confidence scores
- Source information

## Edge Cases Handled

1. Special character variations (e.g., "Babē" = "Babe")
2. Ignored terms (e.g., "BIO", "NEB")
3. Position-specific matches:
   - Front-only brands (e.g., "RICH", "RFF", etc.)
   - Front or second word brands (e.g., "heel", "contour", etc.)
4. Case sensitivity (e.g., "HAPPY" must be capitalized)
5. Multiple brand matches prioritization

## Implementation Details

The system uses several sophisticated algorithms:

1. Brand Edge Case Detection
   - Position-aware matching
   - Case sensitivity handling
   - Special character normalization

2. Brand Group Management
   - Consistent canonical brand assignment
   - Related brands grouping
   - Brand hierarchy respect

3. Error Handling and Logging
   - Comprehensive error tracking
   - Detailed logging
   - Statistics collection

4. Performance Optimizations
   - Brand matching caching
   - Efficient string comparisons
   - Memory-efficient processing

## Analysis Features

### Brand Analysis Report
The system generates a comprehensive analysis report (brand-analysis-report.txt) containing:
1. Match Statistics
   - Distribution of match types
   - Confidence score distribution
   - Processing counts

2. Brand Intelligence
   - Most frequent brands
   - Common unmatched patterns
   - Potential new brands to add

3. Matching Patterns
   - Prefix matches
   - Contains matches
   - Fuzzy match distribution

### Configuration Options

#### Fuzzy Matching
- `SIMILARITY_THRESHOLD`: 0.85 (default)
  - Adjustable threshold for fuzzy matching
  - Higher values require closer matches
  - Range: 0.0 to 1.0

- `MIN_BRAND_LENGTH`: 3 (default)
  - Minimum length for fuzzy matching
  - Prevents false positives with short brands

To adjust these values, modify the constants in src/common/brands.ts:
```typescript
const SIMILARITY_THRESHOLD = 0.85;
const MIN_BRAND_LENGTH = 3;
```

### Output Details

#### brand-matching-results.json
```json
{
    "uuid": "generated-uuid",
    "key": "source_countrycode_id",
    "title": "Original Title",
    "assignedBrand": "Matched Brand",
    "matchedBrands": ["Brand Variations"],
    "confidence": 1.0
}
```

#### brand-analysis-report.txt
```
Brand Matching Analysis Report
============================
- Match statistics
- Confidence distribution
- Top matched brands
- Common unmatched patterns
- Potential new brands
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is proprietary and confidential.
