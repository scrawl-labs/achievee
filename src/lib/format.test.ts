import { describe, expect, it } from 'vitest';
import { formatShortWon, formatWon } from './format';

describe('formatWon', () => {
  it('천 단위 쉼표와 원', () => {
    expect(formatWon(1234)).toBe('1,234원');
  });
});

describe('formatShortWon', () => {
  it('만 원 미만은 쉼표, 이상은 만 단위', () => {
    expect(formatShortWon(5000)).toBe('5,000');
    expect(formatShortWon(10000)).toBe('1만');
    expect(formatShortWon(12000)).toBe('1.2만');
    expect(formatShortWon(123456)).toBe('12.3만');
  });
});
