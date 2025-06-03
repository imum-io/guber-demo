export class BrandsGroup {
    private brandSize: Map<string, number>
    private brandParent: Map<string, string>

    constructor() {
        this.brandSize = new Map<string, number>()
        this.brandParent = new Map<string, string>()
    }

    public initBrand(brand: string): void {
        if (!this.brandParent.has(brand)) {
            this.brandParent.set(brand, brand)
            this.brandSize.set(brand, 1)
        }
    }

    public findBrandParent(brand: string): string {
        if (this.brandParent.get(brand) === brand) {
            return brand
        }

        const parent = this.findBrandParent(this.brandParent.get(brand))
        this.brandParent.set(brand, parent)
        return parent
    }

    public groupBrands(brand1: string, brand2: string): void {
        const parent1 = this.findBrandParent(brand1)
        const parent2 = this.findBrandParent(brand2)

        if (parent1 !== parent2) {
            const size1 = this.brandSize.get(parent1)
            const size2 = this.brandSize.get(parent2)

            if (size1 < size2) {
                this.brandParent.set(parent1, parent2)
                this.brandSize.set(parent2, size2 + size1)
            } else {
                this.brandParent.set(parent2, parent1)
                this.brandSize.set(parent1, size1 + size2)
            }
        }
    }

    public getAllGroups(): Map<string, string[]> {
        const groups = new Map<string, string[]>()
        
        for (const brand of this.brandParent.keys()) {
            const parent = this.findBrandParent(brand)
            if (!groups.has(parent)) {
                groups.set(parent, [])
            }
            groups.get(parent)!.push(brand)
        }
        
        return groups
    }
}
