### Summary of Changes

This PR completes the `assignBrandIfKnown` logic update, including:

- Incorporated **brands edge case logic**:    
    1. Babē = Babe
    2. ignore BIO, NEB
    3. RICH, RFF, flex, ultra, gum, beauty, orto, free, 112, kin, happy has to be in the front
    4. heel, contour, nero, rsv in front or 2nd word
    5. if >1 brands matched, prioritize matching beginning
    6. HAPPY needs to be matched capitalized

- Ensured **consistent brand assignment** from brand groups by sorting and always selecting the first brand.

---

### Notes:
- Code formatting was preserved as per the instruction.
- Used `const` and `let` appropriately based on variable mutability.
- Code follows the structure of the existing codebase.