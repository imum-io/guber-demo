const brandSize = new Map<string, number>()
const brandParent = new Map<string, string>()

export function initBrand(brand: string): void {
    if (!brandParent.has(brand)) {
        brandParent.set(brand, brand)
        brandSize.set(brand, 1)
    }
}

export function findBrandParent (brand: string): string {
    if (brandParent.get(brand) === brand) {
        return brand
    }

    const parent = findBrandParent(brandParent.get(brand))
    brandParent.set(brand, parent)
    return parent
}

export function groupBrands (brand1: string, brand2: string): void {
    const parent1 = findBrandParent(brand1)
    const parent2 = findBrandParent(brand2)

    if (parent1 !== parent2) {
        if (brandSize.get(parent1) < brandSize.get(parent2)) {
            brandParent.set(parent1, parent2)
            brandSize.set(parent2, brandSize.get(parent2) + brandSize.get(parent1))
        } else {
            brandParent.set(parent2, parent1)
            brandSize.set(parent1, brandSize.get(parent1) + brandSize.get(parent2))
        }
    }
}
