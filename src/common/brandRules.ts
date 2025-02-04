type BrandRules = {
  exactMatchBrands: string[];
  firstOrSecondWord: string[];
  compoundBrands: string[];
  prefixBrands: string[];
  normalizations: { [key: string]: string };
  ignoreBrands: string[];
  mustBeFirst: string[];
  capitalizedBrands: string[];
  genericProducts: string[];
  numericBrandPatterns: RegExp[];
  brandPriority: string[];
  bioProducts: { [key: string]: boolean };
};

export const brandRules: BrandRules = {
  // Brands that must be matched exactly as capitalized
  exactMatchBrands: [
    "BD",
    "SVR",
    "ISDIN",
    "PROVISOR",
    "MATH",
    "IDUN",
    "DETOX",
    "ATLANT",
    "APILAKAS",
    "ANIMPLUS",
    "COR4",
    "APINASAL",
    "FERRONEMIS",
    "FERROCAPS",
    "SEDANORM",
    "COLONWELL",
    "MANTRA",
    "STOPOROSE",
    "CLEAN ME",
    "BACK TO LIFE",
    "LIEKNĖK",
    "APOTHEKA",
    "CARDUSCAPS",
    "COSMOS",
    "BRONCHONORM",
    "PRIMA",
    "ACTIPUR",
    "SYNSATION",
    "CIZETA",
    "AQUAMAG",
    "MIRADENT",
    "MICRO-TOUCH",
    "MEMOSTAR",
    "HAGER&WERKEN",
    "20 MILLIARDS",
    "BIONIKE",
    "ECOSH",
    "SPORT&JOINTS",
    "SPORT&BASIC",
    "SPORT&CARDIO",
  ],

  // Brands that must be first or second word
  firstOrSecondWord: ["heel", "contour", "nero", "rsv", "miradent"],

  // Compound brand names (multi-word brands)
  compoundBrands: [
    "formula vitale",
    "gentle day",
    "idun minerals",
    "saffra mood",
    "dr. browns",
    "micro-touch",
    "memostar infinite",
    "memostar focus",
    "bioglucosamine marine",
    "hager&werken",
    "miradent xylitol",
  ],

  // Brands that start with these prefixes should be matched
  prefixBrands: [
    "bio", // For bioVitamin, bioKalcis, etc.
    "aquamag", // For AQUAMAG+B6, etc.
    "cizeta", // For CIZETA products
  ],

  // Brand normalizations (equivalents)
  normalizations: {
    "dr.browns": "dr.browns",
    "dr. browns": "dr.browns",
    "micro-touch": "MICRO-TOUCH",
    "memostar infinite": "MEMOSTAR",
    "memostar focus": "MEMOSTAR",
    carduscaps: "CARDUSCAPS",
    cosmos: "COSMOS",
    bronchonorm: "BRONCHONORM",
    prima: "PRIMA",
    actipur: "ACTIPUR",
    synsation: "SYNSATION",
    "miradent xylitol": "MIRADENT",
    "hager&werken": "HAGER&WERKEN",
    "20 milliards": "20 MILLIARDS",
    "20milliards": "20 MILLIARDS",
    bionike: "BIONIKE",
    "bio-nike": "BIONIKE",
    "sport&joints": "SPORT&JOINTS",
    "sport&basic": "SPORT&BASIC",
    "sport&cardio": "SPORT&CARDIO",
    biovitamin: "bioVITAMIN",
    biokalcis: "bioKALCIS",
    biovitaminas: "bioVitaminas",
  },

  // Brands to completely ignore
  ignoreBrands: ["BIO", "NEB", "911", "3C PHARMA LABORATOIRES"],

  // Brands that must be at the start
  mustBeFirst: [
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
  ],

  //   capitalize brands
  capitalizedBrands: ["HAPPY"],

  // Add the new genericProducts array
  genericProducts: [
    "Gliukozė su vitaminu C",
    "Vitaminas C",
    "Gliukozės milteliai",
    "Bičių duonelės pastilės",
  ],

  // Add new property for numeric brands pattern
  numericBrandPatterns: [/^(\d+)\s+MILLIARDS$/i],

  // Add priority order for brand matching
  brandPriority: ["SPORT&JOINTS", "SPORT&BASIC", "SPORT&CARDIO", "BIONIKE"],

  // Add specific rules for bio* products
  bioProducts: {
    bioVitaminas: true,
    bioKALCIS: true,
    bioVITAMIN: true,
  },
};
