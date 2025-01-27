import { Job } from "bullmq"
import { countryCodes, dbServers, EngineType } from "../config/enums"
import { ContextType } from "../libs/logger"
import { jsonOrStringForDb, jsonOrStringToJson, stringOrNullForDb, stringToHash } from "../utils"
import _ from "lodash"
import { sources } from "../sites/sources"
import items from "./../../pharmacyItems.json"
import connections from "./../../brandConnections.json"
import brandValidator from "./validator"

type BrandsMapping = {
    [key: string]: string[]
}


// returns Map<brands, brand_unique or representer of that brand group>
// simplify the map efficiently and remove duplicates and keep the group by a single brand as representer
export function getBrandsGroupMap() {
    const brandConnection: Map<string, Set<string>> = new Map();
   
    connections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
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
    // lets map it to it's representer brand
  
    // Map<brands, brand_unique or representer of that brand group>
    const brandGroupMap = new Map<string, string>();
  
    // recursively find all the members of the group and assign a single brand to all
    function mapBrandGroup(brand: string, groupName?: string) {
      if (brandGroupMap.has(brand)) {
        return;
      }
  
      // if groupName is not provided then assign the brand to itself
      const group = groupName || brand;
  
      if (brandConnection.has(brand)) {
        brandGroupMap.set(brand, group);
  
        for (const relatedBrand of brandConnection.get(brand)) {
          mapBrandGroup(relatedBrand, group);
        }
        brandConnection.delete(brand);
      }
    }
  
    while (brandConnection.size > 0) {
      //just get the first brand from the map
      const brand = brandConnection.keys().next().value; // just got the first value of the iterator
      mapBrandGroup(brand);
    }
  
    return brandGroupMap;
  }
  

export async function getBrandsMapping(): Promise<BrandsMapping> {
//     type of connection is -> { manufacturer_p1: string, manufacturers_p2: string}[]
    const brandConnections = connections

       // Create a map to track brand relationships
    // for this map manufacturer_p1 is the key
    // manufacturers_p2 is multiple brands separated by ; (connected brands)
    // if connected-brands(brands from manufacturers_p2) are not in the map we add it
    // the value of the map is a set of connected brands
    // that means-> p1 will have every brands from p2 and vice versa
    const brandMap = new Map<string, Set<string>>()

    brandConnections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
        const brand1 = manufacturer_p1.toLowerCase()
        const brands2 = manufacturers_p2.toLowerCase()
        const brand2Array = brands2.split(";").map((b) => b.trim())
        if (!brandMap.has(brand1)) {
            brandMap.set(brand1, new Set())
        }
        brand2Array.forEach((brand2) => {
            if (!brandMap.has(brand2)) {
                brandMap.set(brand2, new Set())
            }
            brandMap.get(brand1)!.add(brand2)
            brandMap.get(brand2)!.add(brand1)
        })
    })

    // Build the final flat map
    const flatMap = new Map<string, Set<string>>()

    // this function do node search(DFS with for loop as pop is used) and get all the connected brands
    const getRelatedBrands = (map: Map<string, Set<string>>, brand: string): Set<string> => {
        const relatedBrands = new Set<string>()
        const queue = [brand]
        while (queue.length > 0) {
            const current = queue.pop()!
            if (map.has(current)) {
                const brands = map.get(current)!
                for (const b of brands) {
                    if (!relatedBrands.has(b)) {
                        relatedBrands.add(b)
                        queue.push(b)
                    }
                }
            }
        }
        return relatedBrands
    }

    brandMap.forEach((_, brand) => {
        const relatedBrands = getRelatedBrands(brandMap, brand)
        flatMap.set(brand, relatedBrands)
    })

    // Convert the flat map to an object for easier usage
    const flatMapObject: Record<string, string[]> = {}

    flatMap.forEach((relatedBrands, brand) => {
        flatMapObject[brand] = Array.from(relatedBrands)
    })


    //if b1 is related to b2 and b2 is related to b3 then b1 is related to b3
    // so. it will return a map of brands with all connected ones.
    return flatMapObject
}

async function getPharmacyItems(countryCode: countryCodes, source: sources, versionKey: string, mustExist = true) {
   const finalProducts = items
    return finalProducts
}

export async function assignBrandIfKnown(countryCode: countryCodes, source: sources, job?: Job) {
    const context = { scope: "assignBrandIfKnown" } as ContextType

    // Map<Brand, Set<All Connected Brands>>
    // const brandsMapping = await getBrandsMapping()

    // Map<Brand, Brand Representing the Group>
    const brandsMapping = getBrandsGroupMap()

    const versionKey = "assignBrandIfKnown"
    let products = await getPharmacyItems(countryCode, source, versionKey, false)
    let counter = 0


    // map all the unique brands so that we can iterate over them
    // so that don't need to run this for every product
    const brands = Array.from(brandsMapping.keys())

    for (let product of products) {
        counter++

        if (product.m_id) {
            // Already exists in the mapping table, probably no need to update
            continue
        }

        // tracks the best match
        let matchBrand = null
        // tracks the index of the best match
        let matchedIndex = -1

        for (const brand of brands) {
            const curMatch = brandValidator.validate(product.title, brand)

            if(curMatch == -1) {
                continue
            }

            //if matchedIndex is -1 then it means it's the first match
            if(matchedIndex == -1) {
                matchedIndex = curMatch
                matchBrand = brand
            }


            // if current match is less than the previous match then update the match
            if (curMatch < matchedIndex) {
                matchedIndex = curMatch
                matchBrand = brand
            }

            // if the current match is 0 then it's the best match
            // as it is from the begining of the string
            if(matchedIndex == 0) {
                break
            }
        }

        


        // iterate over all the brands and check if the brand is in the product title 
        //
        // let matchedBrands = []
        // for (const brandKey in brandsMapping) {
        //     const relatedBrands = brandsMapping[brandKey]
        //     for (const brand of relatedBrands) {
        //         if (matchedBrands.includes(brand)) {
        //             continue
        //         }
        //         const isBrandMatch = brandValidator.validate(product.title, brand)
        //         if (isBrandMatch) {
        //             // console.log(`Matched: ${brand} in ${product.title}`)
        //             matchedBrands.push(brand)
        //         }
        //     }
        // }
        // console.log(`${product.title} -> ${_.uniq(matchedBrands)}`)

        const sourceId = product.source_id

        if(!matchBrand) {
            console.log("No Brand Matched", product.title)
            continue
        }

        const brandRepresenter = brandsMapping.get(matchBrand)

        const key = `${source}_${countryCode}_${sourceId}`
        const uuid = stringToHash(key)

        product.m_id = brandRepresenter // brand

        console.log(matchBrand, brandRepresenter, product.title)
    }
}
