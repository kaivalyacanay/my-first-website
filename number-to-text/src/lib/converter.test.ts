import { describe, expect, it } from 'vitest';
import { convertNumberToText } from './converter';

describe('convertNumberToText', () => {
  it('converts zero', () => {
    expect(convertNumberToText(0, 'international')).toBe('Zero');
    expect(convertNumberToText(0, 'indian')).toBe('Zero');
  });

  it('converts small numbers', () => {
    expect(convertNumberToText(21, 'international')).toBe('Twenty one');
    expect(convertNumberToText(21, 'indian')).toBe('Twenty one');
  });

  it('converts hundreds without conjunctions', () => {
    expect(convertNumberToText(105, 'international')).toBe('One hundred five');
  });

  it('converts using the international system', () => {
    expect(convertNumberToText(12_345_678, 'international')).toBe(
      'Twelve million three hundred forty five thousand six hundred seventy eight'
    );
  });

  it('converts using the indian system', () => {
    expect(convertNumberToText(12_345_678, 'indian')).toBe(
      'One crore twenty three lakh forty five thousand six hundred seventy eight'
    );
  });

  it('handles maximum supported value', () => {
    expect(convertNumberToText(9_999_999_999, 'international')).toBe(
      'Nine billion nine hundred ninety nine million nine hundred ninety nine thousand nine hundred ninety nine'
    );
    expect(convertNumberToText(9_999_999_999, 'indian')).toBe(
      'Nine hundred ninety nine crore ninety nine lakh ninety nine thousand nine hundred ninety nine'
    );
  });

  it('throws on invalid numbers', () => {
    expect(() => convertNumberToText(-1, 'international')).toThrow();
  });
});
