export class TrieNode {
    children: Record<string, TrieNode> = {}
    isEndOfWord: boolean = false
    brand: string | null = null
}

export class BrandTrie {
    private root = new TrieNode()

    insert(brand: string) {
        const tokens = brand.toLowerCase().split(/\s+/)
        let node = this.root
        for (const word of tokens) {
            if (!node.children[word]) {
                node.children[word] = new TrieNode()
            }
            node = node.children[word]
        }
        node.isEndOfWord = true
        node.brand = brand
    }

    searchTokens(tokens: string[]): string[] {
        const matchedBrands = new Set<string>()
        for (let i = 0; i < tokens.length; i++) {
            let node = this.root
            for (let j = i; j < tokens.length; j++) {
                const word = tokens[j]
                if (!node.children[word]) break
                node = node.children[word]
                if (node.isEndOfWord && node.brand) {
                    matchedBrands.add(node.brand)
                }
            }
        }
        return Array.from(matchedBrands)
    }

    match(title: string): string[] {
        const normalized = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        const tokens = normalized.toLowerCase().split(/\s+/)
        return this.searchTokens(tokens)
    }
}

export function buildBrandTrie(brands: string[]): BrandTrie {
    const trie = new BrandTrie()
    for (const brand of brands) {
        trie.insert(brand)
    }
    return trie
}

export function getCanonicalBrand(brand: string, brandGroups: Record<string, string[]>): string {
    for (const [canonical, variants] of Object.entries(brandGroups)) {
        if (canonical === brand || variants.includes(brand)) {
            return canonical
        }
    }
    return brand
}