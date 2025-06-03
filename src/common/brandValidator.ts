import { normalizeBrand } from "./utils"
import {
    TrieNode,
    BrandMatch,
    BrandRule,
    ruleType,
    FRONT_ONLY_BRANDS,
    GENERIC_TERMS,
    CASE_SENSITIVE_BRANDS,
    FLEXIBLE_POSITION_BRANDS,
 } from "../types/common"


export class AhoCorasickBrandMatcher {
    private root: TrieNode
    private wordBoundaryCache: Map<string, number[]>
    private brandRules: Map<string, BrandRule[]>
    private isBuilt: boolean = false
    
    constructor() {
        this.root = this.createNode()
        this.wordBoundaryCache = new Map()
        this.brandRules = new Map()
    }
    
    public buildMatcher(brands: Set<string>): void {
        if (this.isBuilt) return
        
        console.time('Building Aho-Corasick Automaton')
        
        this.buildTrie(brands)
        
        this.buildFailureLinks()
        
        this.preprocessBrandRules(brands)
        
        this.isBuilt = true
        console.timeEnd('Building Aho-Corasick Automaton')
    }
    
    private createNode(): TrieNode {
        return {
            children: new Map(),
            isEndOfWord: false,
            brands: new Set(),
            depth: 0
        }
    }
    
    private buildTrie(brands: Set<string>): void {
        for (const brand of brands) {
            const normalizedBrand = normalizeBrand(brand)
            let current = this.root
            
            for (let i = 0; i < normalizedBrand.length; i++) {
                const char = normalizedBrand[i]
                
                if (!current.children.has(char)) {
                    const newNode = this.createNode()
                    newNode.depth = current.depth + 1
                    current.children.set(char, newNode)
                }
                
                current = current.children.get(char)!
            }
            
            current.isEndOfWord = true
            current.brands.add(brand)
        }
    }
    
    private buildFailureLinks(): void {
        const queue: TrieNode[] = []
        
        for (const child of this.root.children.values()) {
            child.failureLink = this.root
            queue.push(child)
        }
        
        while (queue.length > 0) {
            const current = queue.shift()!
            
            for (const [char, child] of current.children) {
                queue.push(child)
                
                let temp = current.failureLink
                while (temp && !temp.children.has(char)) {
                    temp = temp.failureLink
                }
                
                child.failureLink = temp ? temp.children.get(char)! : this.root
                
                child.outputLink = child.failureLink?.isEndOfWord 
                    ? child.failureLink 
                    : child.failureLink?.outputLink
            }
        }        
    }
    
    private preprocessBrandRules(brands: Set<string>): void {
        for (const brand of brands) {
            const normalizedBrand = normalizeBrand(brand)
            const rule: BrandRule[] = []
            
            if (this.isGenericTerm(normalizedBrand)) {
                rule.push({ type: ruleType.GENERIC, priority: 0 })
            } else if (this.isFrontOnlyBrand(normalizedBrand)) {
                rule.push({ type: ruleType.FRONT_ONLY, priority: 3, maxPosition: 0 })
            } else if (this.isFlexiblePositionBrand(normalizedBrand)) {
                rule.push({ type: ruleType.FLEXIBLE, priority: 2, maxPosition: 1 })
            } else {
                rule.push({ type: ruleType.NORMAL, priority: 1 })
            }

            if (this.isCaseSensitiveBrand(normalizedBrand)) {
                const caseRule = this.getCaseSensitiveRule(normalizedBrand)
                rule.push({ 
                    type: ruleType.CASE_SENSITIVE, 
                    priority: 4, 
                    caseSensitiveCheck: caseRule?.requiredCase 
                })
            }
            
            this.brandRules.set(normalizedBrand, rule)
        }        
    }
    
    public findAllMatches(text: string): BrandMatch[] {
        if (!this.isBuilt) {
            throw new Error('Matcher not built. Call buildMatcher() first.')
        }
        
        const normalizedText = normalizeBrand(text)
        const matches: BrandMatch[] = []
        const wordBoundaries = this.getWordBoundaries(text)
        
        let current = this.root
        
        console.log(`🔍 Processing text: "${text}"`)
        console.log(`📝 Normalized text: "${normalizedText}"`)
        console.log(`📍 Word boundaries: [${wordBoundaries.join(', ')}]`)
        
        for (let i = 0; i < normalizedText.length; i++) {
            const char = normalizedText[i]
            
            while (current !== this.root && !current.children.has(char)) {
                current = current.failureLink!
            }
            
            if (current.children.has(char)) {
                current = current.children.get(char)!
            }
            
            let temp = current
            while (temp) {
                if (temp.isEndOfWord) {
                    for (const brand of temp.brands) {
                        const match = this.createMatch(brand, i, text, wordBoundaries)
                        if (match && this.isValidWordBoundary(normalizedText, match.startIndex, match.endIndex)) {
                            matches.push(match)
                            console.log(`🎯 Found potential match: "${match.brand}" at position ${match.startIndex}-${match.endIndex} (word position ${match.wordPosition}`)
                        }
                    }
                }
                temp = temp.outputLink
            }
        }
        
        return matches
    }
    
    private createMatch(brand: string, endIndex: number, originalText: string, wordBoundaries: number[]): BrandMatch | null {
        const normalizedBrand = normalizeBrand(brand)
        const brandLength = normalizedBrand.length
        const startIndex = endIndex - brandLength + 1
        
        if (startIndex < 0) return null
        
        const wordPosition = this.getWordPosition(wordBoundaries, startIndex)
        const rule = this.brandRules.get(normalizedBrand)
        
        if (!rule) return null
        
        return {
            brand,
            startIndex,
            endIndex: endIndex + 1,
            wordPosition,
        }
    }
    
    public validateMatches(matches: BrandMatch[], originalText: string): BrandMatch[] {
        const validMatches: BrandMatch[] = []
        
        console.log(`🧪 Validating ${matches.length} matches against business rules...`)
        
        for (const match of matches) {
            const rules = this.brandRules.get(normalizeBrand(match.brand))
            if (!rules) {
                console.log(`❌ No rule found for brand: ${match.brand}`)
                continue
            }
            
            let isValid = true
            let validationReason = ''

            for (const rule of rules) {
                switch (rule.type) {
                    case ruleType.GENERIC:
                        isValid &&= false
                        validationReason = 'Generic term filtered out'
                        break
                        
                    case ruleType.FRONT_ONLY:
                        isValid &&= match.wordPosition === 0
                        validationReason = isValid ? 'Front-only brand at correct position' : `Front-only brand at wrong position (${match.wordPosition})`
                        break
                        
                    case ruleType.FLEXIBLE:
                        isValid &&= match.wordPosition <= (rule.maxPosition || 1)
                        validationReason = isValid ? 'Flexible brand at valid position' : `Flexible brand at invalid position (${match.wordPosition})`
                        break
                        
                    case ruleType.CASE_SENSITIVE:
                        isValid &&= this.validateCaseSensitive(originalText, match, rule.caseSensitiveCheck)
                        validationReason = isValid ? 'Case-sensitive validation passed' : 'Case-sensitive validation failed'
                        break
                        
                    case ruleType.NORMAL:
                    default:
                        isValid &&= true
                        validationReason = 'Normal brand validation passed'
                        break
                }
            }
            
            if (isValid) {
                validMatches.push(match)
                console.log(`✅ ${validationReason}: "${match.brand}"`)
            } else {
                console.log(`❌ ${validationReason}: "${match.brand}"`)
            }
        }
        
        return validMatches
    }
    
    public prioritizeMatches(matches: BrandMatch[]): BrandMatch[] {
        return matches.sort((a, b) => (a.wordPosition - b.wordPosition))
    }
    
    public getAllBrandMatches(text: string): string[] {
        const allMatches = this.findAllMatches(text)
        const validMatches = this.validateMatches(allMatches, text)
        const prioritized = this.prioritizeMatches(validMatches)

        return prioritized.map(match => match.brand)
    }
    
    public getDetailedMatches(text: string): BrandMatch[] {
        const allMatches = this.findAllMatches(text)
        const validMatches = this.validateMatches(allMatches, text)

        return this.prioritizeMatches(validMatches)
    }
    
    public processProduct(productTitle: string): BrandMatch[] {
        const allMatches = this.findAllMatches(productTitle)
        const validMatches = this.validateMatches(allMatches, productTitle)
        const prioritized = this.prioritizeMatches(validMatches)
        
        return prioritized
    }
    
    private isGenericTerm(brand: string): boolean {
        return GENERIC_TERMS.includes(brand)
    }
    
    private isFrontOnlyBrand(brand: string): boolean {
        return FRONT_ONLY_BRANDS.includes(brand)
    }
    
    private isFlexiblePositionBrand(brand: string): boolean {
        return FLEXIBLE_POSITION_BRANDS.includes(brand)
    }
    
    private isCaseSensitiveBrand(brand: string): boolean {
        return CASE_SENSITIVE_BRANDS.some(rule => rule.brand === brand)
    }
    
    private getCaseSensitiveRule(brand: string): { brand: string, requiredCase: string } | undefined {
        return CASE_SENSITIVE_BRANDS.find(rule => rule.brand === brand)
    }
    
    private validateCaseSensitive(originalText: string, match: BrandMatch, requiredCase?: string): boolean {
        if (!requiredCase) return true
        
        const actualText = originalText.substring(match.startIndex, match.endIndex)
        return actualText.includes(requiredCase)
    }
    
    private getWordBoundaries(text: string): number[] {
        if (this.wordBoundaryCache.has(text)) {
            return this.wordBoundaryCache.get(text)!
        }
        
        const boundaries: number[] = [0]
        for (let i = 0; i < text.length; i++) {
            if (/\s/.test(text[i]) && i + 1 < text.length && !/\s/.test(text[i + 1])) {
                boundaries.push(i + 1)
            }
        }
        
        this.wordBoundaryCache.set(text, boundaries)
        return boundaries
    }
    
    private getWordPosition(wordBoundaries: number[], charIndex: number): number {
        for (let i = wordBoundaries.length - 1; i >= 0; i--) {
            if (wordBoundaries[i] <= charIndex) {
                return i
            }
        }
        return 0
    }
    
    private isValidWordBoundary(text: string, start: number, end: number): boolean {
        const charBefore = start > 0 ? text[start - 1] : ' '
        const charAfter = end < text.length ? text[end] : ' '
        
        const isWordChar = (char: string) => /[a-z0-9]/.test(char)
        
        const validBefore = !isWordChar(charBefore) || start === 0
        const validAfter = !isWordChar(charAfter) || end === text.length
        
        return validBefore && validAfter
    }
}
