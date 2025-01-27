
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


// If any special case failed then validate with this function
// has to return the index of the brand in the product title or -1 if not found
function checkBrandIsSeparateTerm(input: string, brand: string): number {
  // Escape any special characters in the brand name for use in a regular expression
  const escapedBrand = escapeRegExp(brand);

  // Check if the brand is at the beginning or end of the string
  const atBeginningOrEndMatch = new RegExp(
    `^(?:${escapedBrand}\\s|.*\\s${escapedBrand}\\s.*|.*\\s${escapedBrand})$`,
    "i"
  ).exec(input);

  if(atBeginningOrEndMatch) {
    return atBeginningOrEndMatch.index
  }


  // Check if the brand is a separate term in the string
  const separateTermMatch = new RegExp(`\\b${escapedBrand}\\b`, "i").exec(input);

  if(separateTermMatch) {
    return separateTermMatch.index
  };

  return -1;
}



// abstract class for edge cases
abstract class BrandValidator {
  listedBrands: string[] = [];

  constructor(listedBrands: string[]) {
    this.listedBrands = listedBrands.map((b) => b.toLowerCase());
  }

  hasBrand(brand: string): boolean {
    return this.listedBrands.includes(brand.toLowerCase());
  }

  abstract validate(productTitle: string, brand: string): number;
}



class IgnoreValidator extends BrandValidator {
  constructor(private ignoreList: string[]) {
    super(ignoreList);
  }

  // Ignore the brand
  // so if the brand is matched in the product title, it will be ignored
  validate(_productTitle: string, _brand: string) {
    return -1;
  }
}




class CapitalizedValidator extends BrandValidator {
  constructor(capitalizedList: string[]) {
    super(capitalizedList);
  }

  validate(productTitle: string, brand: string) {
    // regex to check if the brand is capitalized in the product title
    const escapedBrand = escapeRegExp(brand);
    const capitalizedMatch = new RegExp(
      `(^|\\s)${escapedBrand.toUpperCase()}\\s`
    ).exec(productTitle);

    // capitalizedMatch && console.log(capitalizedMatch);
    return capitalizedMatch ? capitalizedMatch.index : -1;
  }
}




class FrontOnlyValidator extends BrandValidator {
  constructor(private frontOnlyList: string[]) {
    super(frontOnlyList);
  }

  validate(productTitle: string, brand: string) {
    const escapedBrand = escapeRegExp(brand);
    const frontMatch = new RegExp(`^${escapedBrand}\\s`, "i").exec(
      productTitle.trim()
    );

    // frontMatch && console.log(frontMatch);
    return frontMatch ? frontMatch.index : -1;
  }
}




class FrontOrSecondValidator extends BrandValidator {
  constructor(private frontOrSecondList: string[]) {
    super(frontOrSecondList);
  }

  validate(productTitle: string, brand: string) {
    const escapedBrand = escapeRegExp(brand);
    const frontOrSecondMatch = new RegExp(
      `(^(${escapedBrand}\\s))|(^\\S+\\s+(${escapedBrand})(?:\\s|$))`,
      "i"
    ).exec(productTitle);

    // frontOrSecondMatch && console.log(frontOrSecondMatch);
    return frontOrSecondMatch? frontOrSecondMatch.index : -1;
  }
}



class NormalizedBrandValidator extends BrandValidator {
  normalizedBrandMap: Map<string, string>;

  constructor(normalizedMap: Map<string, string>) {
    const keys = Array.from(normalizedMap.keys());
    super(keys);
    this.normalizedBrandMap = normalizedMap;
  }

  validate(productTitle: string, brand: string) {
    const normalizedBrand = this.normalizedBrandMap.get(brand);

    if (normalizedBrand) {
      // return (
      //   checkBrandIsSeparateTerm(productTitle, normalizedBrand) ||
      //   checkBrandIsSeparateTerm(productTitle, brand)
      // );
      const normalizedIndex = checkBrandIsSeparateTerm(productTitle, normalizedBrand);
      if(normalizedIndex !== -1) {
        return normalizedIndex;
      }

      const brandIndex = checkBrandIsSeparateTerm(productTitle, brand);
      if(brandIndex !== -1) {
        return brandIndex;
      }
    }
    return -1;
  }
}



class BrandValidatorFactory {
  validators: BrandValidator[] = [];

  constructor(...validators: BrandValidator[]) {
    this.validators.push(...validators);
  }

  addValidator(validator: BrandValidator) {
    this.validators.push(validator);
  }

  validate(productTitle: string, brand: string) {
    for (const validator of this.validators) {
      if (validator.hasBrand(brand)) {
        return validator.validate(productTitle, brand);
      }
    }

    // now try normal check
    return checkBrandIsSeparateTerm(productTitle, brand);
  }
}



const rules = {
  ignore: ["bio", "neb"],
  capitalized: ["happy"],
  frontOnly: [
    "rich",
    "rff",
    "flex",
    "ultra",
    "gum",
    "beauty",
    "orto",
    "free",
    "112",
    "kin",
    "happy",
  ],
  frontOrSecond: ["heel", "contour", "nero", "rsv"],
  normalizedMap: new Map<string, string>([["babe", "babē"]]),
};



const brandValidator = new BrandValidatorFactory(
  new IgnoreValidator(rules.ignore),
  new CapitalizedValidator(rules.capitalized),
  new FrontOnlyValidator(rules.frontOnly),
  new FrontOrSecondValidator(rules.frontOrSecond),
  new NormalizedBrandValidator(rules.normalizedMap)
);

export default brandValidator;
