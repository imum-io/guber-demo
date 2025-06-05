
function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isIgnored(name: string): boolean {
  return ["BIO", "NEB"].includes(name.toUpperCase());
}

function matchesStrictFront(words: string[], keywords: string[]): boolean {
  return keywords.some(keyword => keyword.toLowerCase() === words[0]);
}

function matchesLooseFront(words: string[], keywords: string[]): boolean {
  return keywords.some(
    kw => words[0] === kw || (words[1] && words[1] === kw)
  );
}

function getCanonicalBrand(name: string, brandAliases): string {
  const norm = normalizeName(name);

  for (const brand of brandAliases) {
    const canonical = normalizeName(brand.manufacturer_p1);
    const aliases = brand.manufacturers_p2
      .split(";")
      .map(a => normalizeName(a));

    if (canonical === norm || aliases.includes(norm)) {
      return brand.manufacturer_p1;
    }
  }

  return name;
}

export default function validateBrand(itemName: string, brandMap, brandAliases): string | null {
  const original = itemName;
  const name = normalizeName(itemName);
  const words = name.split(/\s+/);

  if (isIgnored(words[0])) return null;

  const mustFront = ["RICH", "RFF", "flex", "ultra", "gum", "beauty", "orto", "free", "112", "kin", "happy"].map(w => w.toLowerCase());
  const allow1or2 = ["heel", "contour", "nero", "rsv"];

  
  if (words.includes("happy") && !original.includes("HAPPY")) {
    return null;
  }

  if (
    !matchesStrictFront(words, mustFront) &&
    !matchesLooseFront(words, allow1or2)
  ) {
    return null;
  }

  
  const possibleMatches = Object.entries(brandMap).filter(
    ([brand, aliases]: [string, string[]]) =>
      aliases.some(alias =>
        name.includes(normalizeName(alias))
      )
  );

  if (!possibleMatches.length) return null;

  possibleMatches.sort((a, b) => {
    const aPos = name.indexOf(normalizeName(a[0]));
    const bPos = name.indexOf(normalizeName(b[0]));
    return aPos - bPos;
  });

  const bestMatch = possibleMatches[0][0];
  return getCanonicalBrand(bestMatch, brandAliases);
}
