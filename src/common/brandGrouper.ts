import { normalizeBrand } from "./brandUtils";

export type BrandsMapping = Record<string, string[]>;

export function createBrandGroups(connections: any[]): BrandsMapping {
  const brandMap = new Map<string, Set<string>>();

  connections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
    const brand1 = normalizeBrand(manufacturer_p1);
    const brand2List = manufacturers_p2.split(";").map(normalizeBrand);

    if (!brandMap.has(brand1)) brandMap.set(brand1, new Set());

    brand2List.forEach((brand2: string) => {
      if (!brandMap.has(brand2)) brandMap.set(brand2, new Set<string>());
      brandMap.get(brand1)!.add(brand2);
      brandMap.get(brand2)!.add(brand1);
    });
  });

  const brandGroups: BrandsMapping = {};
  brandMap.forEach((related, brand) => {
    brandGroups[brand] = Array.from(related);
  });

  return brandGroups;
}
