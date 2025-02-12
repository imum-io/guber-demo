## Changes for **Task 1**:

Goal: Add validations, and Optimize Execution Time for number of brands checked.

(Note: Some of the changes made for task 1 had been removed in task 2 as progressed, see 2nd point)

1. Refactored `assignBrandIfKnown` function to better understand the responsibility and simplify re-work target .
     - Extracted calculation of `matchedBrands` list as a separate method `matchBrandsByProduct(brandsMapping, product)`, which is solely responsible for iterating over all the brands and their related brands from the brandsMapping and matching with the product

2. `checkBrandIsSeparateTerm` method extended to add validations, and redundant check to visit same brand again and again was optimised by introducing a `visitedBrands` set, and reducing brand check for visitedBrands for the same product.(Note: the `visitedBrands` check here was removed for task 2 as no longer needed).
3. Renamed `checkBrandIsSeparateTerm` to `checkIfBrandMatched` as it represents the implementation better. Have included the following validations in the `checkIfBrandMatched` method:
      - **IgnoreRules**: If the brand name is bio/neb simply ignore this brand.
      - **NormalizeRules**: i.e BABÉ to BABE, or any similar strings ( [Stackoverflow](https://stackoverflow.com/a/45053429) )
      - **AtTheFrontRules**: If the product’s name doesn’t start with these brands, its not a match for that brand
      - **CaptalizedRules**: i.e HAPPY, the word is checked to be capitalized or not.

4. `checkIfBrandMatched` (former: `checkBrandIsSeparateTerm`) is modified to send position of match instead of boolean `true` or `false`. As the requirement is if more than one brand match a product, I need to provide final match based on the one matches at the beginning.

## Changes for **Task 2**:

Goal: Group all the related brands together, eliminate repetition. (Based on my understanding)

1. `getRelatedBrands` method: `flatMapObject` previously contained mapping for all the brands which resulted in O(N^2) iterations. For example if `baff-bombz: [zimpli kids, baff-bombz]` was present in the mapping, `zimpli kids: [baff-bomz, zimpli kids]` was present as well. I have reworked on the `flatMapObject` (which is basically the brand mappings), to make brands appear only once. If a brand is already visited, ignore it in the depth first search which creates the `flatMapObject` by visiting the brands in `brandMap`
2. Remove `visitedBrand` check done in first task, as its no longer needed as the number of iterations for `relatedBrands` gets reduced from O(n^2) to O(n) after reworking on the `brandMapping`.


Future Improvement that I thought of:

1. If number of additional validations increase, a pipelining based solution (suitable for functional programming) or a strategy (if class based solution needed) can be implemented. I.e:
	```
	import validations from “./validation-pipeline”
	for (validate of validations) {
		validate(brand,product)
    }
    ```
2. Rules can be stored in json/db table, and dynamically load from there.
