class Validator {
    public replaceWords = {
        "babē": "babe"
    }
    
    private ignoreWords= [
        "bio", "neb"
    ]
    
    private mustInFront = [
        "rich", "rff", "flex", "ultra", "gum", "beauty", "orto", "free", "112", "kin", "happy","heel", "contour", "nero", "rsv"
    ]
    
    private inSecWord = [
        'heel', "contour", "nero", "rsv"
    ]
    private mustCapital = [
        "happy"
    ]
    public makeLower(brand:string):string{
        const brandName = brand.toLowerCase()
        if(this.mustCapital.includes(brandName)){
            return brand.toUpperCase()
        }
        if(this.replaceWords[brandName]){
            return this.replaceWords[brandName]
        }
        return brandName
    }

    public normalizeString(input:string){
        return input.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    }
    public checkWordsInBrand(input: string, brand: string): number {
        const words = brand.split(" ")
        return words.indexOf(input)
    }
    public ignoringBrand(brand: string){
        return this.ignoreWords.includes(this.makeLower(brand))
    }
    public prioritizeBrands(brand: string, title: string): string | null {
        const normalizedTitle = title.toLowerCase();
        const words = normalizedTitle.split(/\s+/);
    

        const normalizedBrand = this.makeLower(brand);
        if (this.mustInFront.includes(normalizedBrand) && words[0] === normalizedBrand) {
            return brand;
        }
        if (this.inSecWord.includes(normalizedBrand) && (words[0] === normalizedBrand || words[1] === normalizedBrand)) {
            return brand;
        }
        
        return null;
    }
}

export const validator =   new Validator()
