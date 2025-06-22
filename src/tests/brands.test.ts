import { isBrandMatchEdgeCase, getCanonicalBrandForGroup } from '../common/brands';

describe('Brand Matching', () => {
  describe('isBrandMatchEdgeCase', () => {
    test('matches Babē variations correctly', () => {
      expect(isBrandMatchEdgeCase('Babē Product', 'Babē')).toBeTruthy();
      expect(isBrandMatchEdgeCase('Babe Product', 'Babē')).toBeTruthy();
      expect(isBrandMatchEdgeCase('Baby Product', 'Babē')).toBeFalsy();
    });

    test('ignores BIO and NEB', () => {
      expect(isBrandMatchEdgeCase('BIO Product', 'BIO')).toBeFalsy();
      expect(isBrandMatchEdgeCase('NEB Product', 'NEB')).toBeFalsy();
    });

    test('matches front-only brands correctly', () => {
      expect(isBrandMatchEdgeCase('RICH Product', 'RICH')).toBeTruthy();
      expect(isBrandMatchEdgeCase('Product RICH', 'RICH')).toBeFalsy();
    });

    test('matches front-or-second brands correctly', () => {
      expect(isBrandMatchEdgeCase('heel Product', 'heel')).toBeTruthy();
      expect(isBrandMatchEdgeCase('The heel Product', 'heel')).toBeTruthy();
      expect(isBrandMatchEdgeCase('Product heel', 'heel')).toBeFalsy();
    });

    test('handles HAPPY capitalization requirement', () => {
      expect(isBrandMatchEdgeCase('HAPPY Product', 'happy')).toBeTruthy();
      expect(isBrandMatchEdgeCase('Happy Product', 'happy')).toBeFalsy();
    });
  });

  describe('getCanonicalBrandForGroup', () => {
    const brandsMapping = {
      'brand-a': ['brand-a', 'brand-a-alt'],
      'brand-b': ['brand-b', 'brand-b-alt'],
      'brand-c': ['brand-c'],
    };

    test('returns consistent brand for group', () => {
      const group1 = ['brand-a', 'brand-a-alt'];
      const group2 = ['brand-a-alt', 'brand-a'];
      
      const result1 = getCanonicalBrandForGroup(group1, brandsMapping);
      const result2 = getCanonicalBrandForGroup(group2, brandsMapping);
      
      expect(result1).toBe(result2);
    });

    test('handles unknown brands', () => {
      const group = ['unknown-brand'];
      const result = getCanonicalBrandForGroup(group, brandsMapping);
      expect(result).toBeNull();
    });

    test('handles mixed known and unknown brands', () => {
      const group = ['brand-a', 'unknown-brand'];
      const result = getCanonicalBrandForGroup(group, brandsMapping);
      expect(result).toBe('brand-a');
    });
  });
});
