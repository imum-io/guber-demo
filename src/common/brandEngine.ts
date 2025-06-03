import { AhoCorasickBrandMatcher } from './brandValidator'
import { BrandMatch } from '../types/common'

export class SimpleBrandEngine {
    private matcher: AhoCorasickBrandMatcher
    private isInitialized: boolean = false
    private brands: Set<string> = new Set()
    
    constructor() {
        this.matcher = new AhoCorasickBrandMatcher()
    }
    
    public async initialize(brands: Set<string>): Promise<void> {
        if (this.isInitialized && this.areBrandsEqual(brands)) {
            console.log('Brand engine already initialized with same brands')
            return
        }
        
        console.time('Simple Brand Engine Initialization')
        
        this.brands = new Set(brands)
        this.matcher = new AhoCorasickBrandMatcher()
        this.matcher.buildMatcher(brands)
        
        this.isInitialized = true
        console.timeEnd('Simple Brand Engine Initialization')
        console.log(`Initialized with ${brands.size} brands`)
    }
    
    public processProduct(productTitle: string): BrandMatch[] {
        if (!this.isInitialized) {
            throw new Error('Engine not initialized. Call initialize() first.')
        }
  
        return this.matcher.processProduct(productTitle)
    }
    
    public getAllMatches(productTitle: string): string[] {
        if (!this.isInitialized) {
            throw new Error('Engine not initialized')
        }
        
        return this.matcher.getAllBrandMatches(productTitle)
    }
    
    public getDetailedMatches(productTitle: string): BrandMatch[] {
        if (!this.isInitialized) {
            throw new Error('Engine not initialized')
        }
        
        return this.matcher.getDetailedMatches(productTitle)
    }
    
    private areBrandsEqual(newBrands: Set<string>): boolean {
        if (this.brands.size !== newBrands.size) return false
        
        for (const brand of newBrands) {
            if (!this.brands.has(brand)) return false
        }
        
        return true
    }
}
