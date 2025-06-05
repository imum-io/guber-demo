#  Brand Deduplication & Assignment
### Overview
Updated TypeScript module to deduplicate >15k brands and assign consistently from unstructured data using engine matches (barcode, others) and JSON files.

### Changes

* Normalized brands: normalizationMap unifies "Babē" to "Babe".
* Ignored non-brands: ignoreWords skips "BIO", "NEB".
* Position rules: prefixWords (e.g., "RICH") at title start; positionSensitiveWords (e.g., "heel") at start or second.
* Prioritized title start: Sorted matches favor beginning.
* Case-sensitive match: exactMatchedBrands requires "HAPPY" capitalized.
* Group consistency: groupMap in getBrandsMapping assigns one brand per group.

#### groupMap Functionalities

* Maps brands to a canonical one (alphabetically first, e.g., "baff-bombz").
* Clusters related brands (e.g., ["baff-bombz", "zimpli kids"]).
* Used in assignBrandIfKnown for uniform assignment.
