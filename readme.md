# Brand Assignment and Deduplication

## Overview

This project is designed to handle the assignment of brands to products based on unstructured data, such as product titles. The primary goals are:

1. **Brand Matching**: Accurately match brand names in product titles using various algorithms.
2. **Deduplication**: Ensure that each group of related brands is consistently assigned the same brand.
3. **Validation**: Incorporate specific validation rules to handle edge cases.

## Features

- **Brand Mapping**: Identifies and groups related brands.
- **Brand Assignment**: Assigns a consistent brand to each product based on matching rules.
- **Validation Rules**: Handles specific edge cases and prioritization of brands.
- **File Output**: Saves the brand assignment map to a JSON file for further use.

## Installation

```sh
yarn install
yarn start
```

## Validation
* Babē = Babe
* ignore BIO, NEB
* RICH, RFF, flex, ultra, gum, beauty, orto, free, 112, kin, happy has to be in the front
* heel, contour, nero, rsv in front or 2nd word
* if >1 brands matched, prioritize matching beginning
* HAPPY needs to be matched capitalized