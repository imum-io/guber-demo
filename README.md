# Brand Matching and Deduplication: A Practical Approach

## Goal

To create a more accurate and consistent brand matching system for pharmacy items, focusing on real-world application and simplified logic.

## Key Design Principles

*   **Practicality Over Perfection:** Prioritized solutions that work effectively in common scenarios, avoiding unnecessary complexity.
*   **Single Brand per Product:** Aimed for a clean and unambiguous brand assignment, choosing a single representative brand for each item.
*   **Consistency Across Brand Groups:** Ensured that all variations or related names for a brand are mapped to a single, consistent identifier.

## Approach and Rationale

1.  **Case Insensitivity:**
    *   Initial concern: Should case sensitivity be enforced?
    *   Real-world Perspective: In practice, slight variations in capitalization are common and don't fundamentally change the brand. Therefore, case-insensitive matching was chosen for most scenarios.

2.  **Prioritizing Beginning Matches:**
    *   Challenge: How to handle products matching multiple brands?
    *   Solution:
        *   Initially considered sorting matched brands based on their appearance in the title.
        *   Adopted a simpler approach: Select the **first** brand that matches at the beginning of the title as the *primary* and *only* brand. This emphasizes relevance and avoids ambiguity.

3.  **Consistent Brand Groups:**
    *   Underlying Principle: Groups of related brands (e.g., "Brand A," "Brand A Ltd.," "Brand A Corp.") all represent the *same* brand.
    *   Solution:
        *   Mapped *all* brands within a group to a single, representative grouped brand.
        *   After matching, assigned this grouped brand to the product, ensuring consistency.

