import { Job } from "bullmq"
import { countryCodes, dbServers, EngineType } from "../config/enums"
import { ContextType } from "../libs/logger"
import { jsonOrStringForDb, jsonOrStringToJson, stringOrNullForDb, stringToHash } from "../utils"
import _ from "lodash"
import { sources } from "../sites/sources"
import items from "./../../pharmacyItems.json"
import connections from "./../../brandConnections.json"

type BrandsMapping = {
    [key: string]: string[]
}

export async function getBrandsMapping(): Promise<BrandsMapping> {
    const brandConnections = connections

    // Create a map to track brand relationships
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

    // Convert the flat map to an object for easier usage
    const flatMapObject: Record<string, string[]> = {}

    brandMap.forEach((relatedBrands, brand) => {
        flatMapObject[brand] = Array.from(relatedBrands)
    })

    return flatMapObject
}

async function getPharmacyItems(countryCode: countryCodes, source: sources, versionKey: string, mustExist = true) {
    const finalProducts = items

    return finalProducts
}

export function checkBrandIsSeparateTerm(input: string, brand: string): boolean {
    brand = brand.toLowerCase()

    // Escape any special characters in the brand name for use in a regular expression
    const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    
    //Babē = Babe, replacing all occurrences of ē for e
    brand = brand.replace("babē", "babe")
    //Not sure if the task means to replace all the occurrences of ē, then it should be brand.replace("ē", "e").
    //However, if it means to replace all the similar characters then, we need to replace with unicode range

    //Ignore BIO, NEB
    if(["bio", "neb"].includes(brand)){
        return false
    }
    //Here I wasn't sure if we should check only for the words bio, neb or any brand name that contains bio, neb
    //If it means to check if a brand name has bio as part of the brand name it should be brand.includes("bio")

    const intputArray = input.toLowerCase().split(" ")

    //RICH, RFF, flex, ultra, gum, beauty, orto, free, 112, kin, happy has to be in the front        
    const hasToBeFirst = ["rich", "rff", "flex", "ultra", "gum", "beauty", "orto", "free", "112", "kin", "happy"]

    if(hasToBeFirst.includes(brand)){
        if(intputArray[0]==brand){
            //HAPPY needs to be matched capitalized
            if(brand == "HAPPY"){
                return (intputArray[0]=="HAPPY")
            }
            return true
        }
        return false
    }

    //heel, contour, nero, rsv in front or 2nd word
    const hasToBeFirstOrSecond =  ["heel", "contour", "nero", "rsv"]

    if(hasToBeFirstOrSecond.includes(brand)){
        return (intputArray.slice(0, 2).includes(brand))
    }
    
    // Check if the brand is at the beginning or end of the string
    const atBeginningOrEnd = new RegExp(
        `^(?:${escapedBrand}\\s|.*\\s${escapedBrand}\\s.*|.*\\s${escapedBrand})$`,
        "i"
    ).test(input)

    // Check if the brand is a separate term in the string
    const separateTerm = new RegExp(`\\b${escapedBrand}\\b`, "i").test(input)

    // The brand should be at the beginning, end, or a separate term
    return atBeginningOrEnd || separateTerm
}

export function assignSameBrandToGroup(brandsMapping):Map<string, string> {
    let assignedBrands = new Map<string, string>();
    let brandGroups = new Map<string, string>();
    
    for (let brand in brandsMapping) {
        if(typeof assignedBrands[brand]!="undefined"){
            continue
        }
        let group = [brand, ...brandsMapping[brand]];
        if(Object.keys(assignedBrands).length==0){
            assignedBrands[brand] = group.sort()[0]
            brandGroups[brand] = group
            continue
        }
        
        let found = false
        for(let a_group in brandGroups){
            if(brandGroups[a_group].includes(brand)){
                assignedBrands[brand] = assignedBrands[a_group]
                brandGroups[brand] = group
                found = true
                break
            }
        }
        
        if(!found){
            for(let abrand of group){
                if(typeof assignedBrands[abrand]!='undefined'){
                    assignedBrands[brand] = assignedBrands[abrand]
                    brandGroups[brand] = group
                    found = true
                    break
                }
            }
        }
        
        
        if(!found){
            assignedBrands[brand] = group.sort()[0]
            brandGroups[brand] = group
        }
        
    }

    return assignedBrands;
}

export async function assignBrandIfKnown(countryCode: countryCodes, source: sources, job?: Job) {
    const context = { scope: "assignBrandIfKnown" } as ContextType

    const brandsMapping = await getBrandsMapping()

    const versionKey = "assignBrandIfKnown"
    let products = await getPharmacyItems(countryCode, source, versionKey, false)
    let counter = 0
    for (let product of products) {
        counter++

        if (product.m_id) {
            // Already exists in the mapping table, probably no need to update
            continue
        }

        let matchedBrands = []
        for (const brandKey in brandsMapping) {
            const relatedBrands = brandsMapping[brandKey]
            for (const brand of relatedBrands) {
                if (matchedBrands.includes(brand)) {
                    continue
                }
                const isBrandMatch = checkBrandIsSeparateTerm(product.title, brand)
                if (isBrandMatch) {
                    matchedBrands.push(brand)
                }
            }
        }
        
        //2nd task - to always assign the same brand for whole group  in all possible cases we should assign only 1
        matchedBrands = matchedBrands.map((brand)=>assignSameBrandToGroup[brand]||brand)
        
        //if>1 brands matched, prioritize matching beginning
        matchedBrands = [...new Set(matchedBrands)].sort((a, b) => {
            const productTitle = product.title.toLowerCase();
            const aInBeginning = productTitle.startsWith(a.toLowerCase()) ? 0 : 1;
            const bInBeginning = productTitle.startsWith(b.toLowerCase()) ? 0 : 1;
            return ((aInBeginning - bInBeginning) || a.localeCompare(b));
        });
        
        console.log(`${product.title} -> ${_.uniq(matchedBrands)}`)
        const sourceId = product.source_id
        const meta = { matchedBrands }
        const brand = matchedBrands.length ? matchedBrands[0] : null

        const key = `${source}_${countryCode}_${sourceId}`
        const uuid = stringToHash(key)

        // Then brand is inserted into product mapping table
    }
}
