import { describe, expect, it } from 'vitest';
import { gardenStage } from './garden';

describe('gardenStage', () => {
  it('할 일이 없으면 empty', () => expect(gardenStage(0, 0)).toBe('empty'));
  it('하나도 못 했으면 seed', () => expect(gardenStage(0, 3)).toBe('seed'));
  it('일부 완료면 sprout', () => expect(gardenStage(1, 3)).toBe('sprout'));
  it('전부 완료면 bloom', () => expect(gardenStage(3, 3)).toBe('bloom'));
});
