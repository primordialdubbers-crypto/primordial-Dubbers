import { describe, it, expect } from 'vitest';
import { calculateRankFromPoints, RANK_TIERS } from '@pdi/shared';

describe('Rank Engine - Threshold Verification (docs/PDI_MASTER_PRD.md)', () => {
  it('correctly maps lower and upper boundaries of ED Rank (0 - 999)', () => {
    expect(calculateRankFromPoints(0)).toBe('ED');
    expect(calculateRankFromPoints(500)).toBe('ED');
    expect(calculateRankFromPoints(999)).toBe('ED');
  });

  it('correctly maps lower and upper boundaries of C Rank (1,000 - 4,999)', () => {
    expect(calculateRankFromPoints(1000)).toBe('C');
    expect(calculateRankFromPoints(2500)).toBe('C');
    expect(calculateRankFromPoints(4999)).toBe('C');
  });

  it('correctly maps lower and upper boundaries of B Rank (5,000 - 11,999)', () => {
    expect(calculateRankFromPoints(5000)).toBe('B');
    expect(calculateRankFromPoints(8000)).toBe('B');
    expect(calculateRankFromPoints(11999)).toBe('B');
  });

  it('correctly maps lower and upper boundaries of A Rank (12,000 - 24,999)', () => {
    expect(calculateRankFromPoints(12000)).toBe('A');
    expect(calculateRankFromPoints(18000)).toBe('A');
    expect(calculateRankFromPoints(24999)).toBe('A');
  });

  it('correctly maps S Rank (>= 25,000) and preserves points above 50,000 milestone', () => {
    expect(calculateRankFromPoints(25000)).toBe('S');
    expect(calculateRankFromPoints(50000)).toBe('S');
    expect(calculateRankFromPoints(75000)).toBe('S');
  });

  it('handles negative points safely by clamping to 0 (ED rank)', () => {
    expect(calculateRankFromPoints(-50)).toBe('ED');
  });

  it('contains all 5 rank definitions with matching metadata and colors', () => {
    expect(Object.keys(RANK_TIERS)).toEqual(['ED', 'C', 'B', 'A', 'S']);
    expect(RANK_TIERS.ED.colorHex).toBe('#8A99AD');
    expect(RANK_TIERS.C.colorHex).toBe('#4E97C2');
    expect(RANK_TIERS.B.colorHex).toBe('#168DFF');
    expect(RANK_TIERS.A.colorHex).toBe('#D5A02E');
    expect(RANK_TIERS.S.colorHex).toBe('#D95436');
  });
});
