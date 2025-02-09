import { Job } from "bullmq";
import { countryCodes } from "../config/enums";
import { ContextType } from "../libs/logger";
import { jsonOrStringForDb, stringToHash } from "../utils";
import _ from "lodash";
import items from "../db/pharmacyItems.json";
import connections from "../db/brandConnections.json";
import { sources } from "../sites/sources";
import {
  findBrandInTitle,
  normalizeBrand,
  validateBrandPosition,
} from "./brand-utils";

type BrandsMapping = Record<string, string[]>;

/**
 * TrieNode class for Trie data structure.
 */
class TrieNode {
  children: Record<string, TrieNode> = {};
  isEndOfWord: boolean = false;
  brand: string | null = null; // Store the complete brand string
}

/**
 * Trie data structure for efficient brand matching.
 */
class Trie {
  root: TrieNode = new TrieNode();

  /**
   * `insert` inserts a brand into the Trie.
   * @param word The brand to insert.
   */
  insert(word: string) {
    let node = this.root;
    for (const char of word) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEndOfWord = true;
    node.brand = word; // Store the complete word at the end node
  }

  /**
   * `search` finds all brands that are prefixes of the input title.
   * @param title The title to search for brands in.
   * @returns An array of matching brands.
   */
  search(title: string): string[] {
    const matches: string[] = [];
    let node = this.root;
    let currentWord = "";

    for (const char of title) {
      if (node.children[char]) {
        currentWord += char;
        node = node.children[char];
        if (node.isEndOfWord && node.brand) {
          matches.push(node.brand); // Retrieve the complete brand
        }
      } else {
        break;
      }
    }
    return matches;
  }
}

/**
 * `createBrandGroups` creates a brand groups.
 * @param connections The brand connections from JSON.
 * @returns A map of canonical brands to lists of associated brands.
 */
function createBrandGroups(connections: any[]): BrandsMapping {
  const brandMap = new Map<string, Set<string>>();

  connections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
    const brand1 = normalizeBrand(manufacturer_p1);
    const brands2 = manufacturers_p2.split(";").map((b) => normalizeBrand(b));

    if (!brandMap.has(brand1)) {
      brandMap.set(brand1, new Set());
    }
    brands2.forEach((brand2) => {
      if (!brandMap.has(brand2)) {
        brandMap.set(brand2, new Set());
      }
      brandMap.get(brand1)!.add(brand2);
      brandMap.get(brand2)!.add(brand1);
    });
  });

  const brandGroups: Record<string, string[]> = {};
  brandMap.forEach((relatedBrands, brand) => {
    brandGroups[brand] = Array.from(relatedBrands);
  });

  return brandGroups;
}

/**
 * `assignBrandIfKnown` uses brandGroups to assign canonical brands.
 * @param countryCode The country code for the products being processed.
 * @param source The source of the product data.
 * @param job Optional job object for BullMQ integration.
 */
export async function assignBrandIfKnown(
  countryCode: countryCodes,
  source: sources,
  job?: Job
) {
  const context: ContextType = { scope: "assignBrandIfKnown" } as ContextType;

  try {
    const brandGroups = createBrandGroups(connections);
    const products = items.filter((item) => !item.m_id);

    // Build the Trie
    const trie = new Trie();
    for (const brand in brandGroups) {
      trie.insert(brand);
    }

    for (const product of products) {
      const title = product.title.trim();
      const normalizedTitle = normalizeBrand(title);
      // Search the trie for brands matching the prefix of normalizedTitle
      const matches = trie.search(normalizedTitle);
      const validatedMatches = matches.filter((brand) =>
        findBrandInTitle(title, brand)
      );

      // Apply priority rules
      const sortedMatches = validatedMatches.sort((a, b) => {
        const aPos = title.toLowerCase().indexOf(a.toLowerCase());
        const bPos = title.toLowerCase().indexOf(b.toLowerCase());
        return aPos - bPos; // Prioritize earlier matches
      });

      if (sortedMatches.length > 0) {
        const assignedBrand = sortedMatches[0];
        console.log(`${title} -> ${assignedBrand}`);

        // TODO: Implement actual database update (replace with your DB logic)
        // await updateBrandMapping(product, assignedBrand);
      }
    }
  } catch (error) {
    console.error("Brand assignment failed:", error);
    throw error;
  }
}
