import { BrandsMapping } from "./types";
import connections from "../../data/brandConnections.json";
import canonicalBrandMap from "../../data/brandsMapping.json";

export async function getRawBrandMapping(): Promise<BrandsMapping> {
  const map = new Map<string, Set<string>>();

  connections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
    const b1 = manufacturer_p1.toLowerCase();
    const b2s = manufacturers_p2.toLowerCase().split(";").map(b => b.trim());

    if (!map.has(b1)) map.set(b1, new Set());
    b2s.forEach(b2 => {
      if (!map.has(b2)) map.set(b2, new Set());
      map.get(b1)!.add(b2);
      map.get(b2)!.add(b1);
    });
  });

  const flat: BrandsMapping = {};
  map.forEach((rel, brand) => {
    flat[brand] = Array.from(rel);
  });

  return flat;
}

export function normalizeBrandMap(brands: BrandsMapping): BrandsMapping {
  const visited = new Set<string>();
  const unified: BrandsMapping = {};

  const dfs = (brand: string, group: Set<string>) => {
    if (visited.has(brand)) return;
    visited.add(brand);
    group.add(brand);
    for (const rel of brands[brand] || []) dfs(rel, group);
  };

  for (const brand of Object.keys(brands)) {
    if (visited.has(brand)) continue;
    const group = new Set<string>();
    dfs(brand, group);

    const canon = Array.from(group).sort()[0];
    group.forEach(b => {
      canonicalBrandMap[b] = canon;
      unified[b] = Array.from(group);
    });
  }

  return unified;
}
