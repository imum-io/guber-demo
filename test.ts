//! This is extra. I am adding this just to clerify my thought process and also validate the solution.

import brands from "./brandConnections.json";
import con from "./brandsMapping.json";

// get all brands from the mapping
// count all the unique brands
const setFromMap = new Set<string>();
Object.keys(con).forEach((key) => {
    con[key].forEach((b) => setFromMap.add(b));
    setFromMap.add(key);
})





// map
type BrandsMapping = {
  [key: string]: Set<string>;
};

const brandConnection: Map<string, Set<string>> = new Map();

brands.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
  const brand1 = manufacturer_p1.toLowerCase();
  const brands2 = manufacturers_p2.toLowerCase();
  const brand2Array = brands2.split(";").map((b) => b.trim());
  //   console.log(brand1, brand2Array);

  if (!brandConnection.has(brand1)) {
    brandConnection.set(brand1, new Set());
  }

  brand2Array.forEach((brand2) => {
    if (!brandConnection.has(brand2)) {
      brandConnection.set(brand2, new Set());
    }
    brandConnection.get(brand1)!.add(brand2);
  });
});

/*
2nd task - to always assign the same brand for whole group. i.e. for 
    "baff-bombz": ["zimpli kids", "baff-bombz"] 
    "zimpli kids": ["baff-bombz", "zimpli kids"] 
in all possible cases we should assign only 1.
doesn't matter which one - it can always be zimpli kids or baff-bombz. 
but after assigning brands, we cannot have both values in our mapping table.
*/

//as all related brands will represent with a single brand
// lets map it to a single brand

// Map<brands, brand_unique or representer of that brand>
const brandGroupMap = new Map<string, string>();

function mapBrandGroup(brand: string, groupName?: string) {
  if (brandGroupMap.has(brand)) {
    return;
  }

  const group = groupName || brand;

  if (brandConnection.has(brand)) {
    brandGroupMap.set(brand, group);

    for (const relatedBrand of brandConnection.get(brand) || []) {
      mapBrandGroup(relatedBrand, group);
    }
    brandConnection.delete(brand);
  }
}

while (brandConnection.size > 0) {
  const brand = brandConnection.keys().next().value;
  mapBrandGroup(brand);
}

console.log(brandGroupMap.size, setFromMap.size);

if(brandGroupMap.size !== setFromMap.size){
    console.error("Brands are not mapped correctly");
    process.exit(1);
} else {
    console.log("Brands are mapped correctly");
}
