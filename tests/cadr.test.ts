import { describe, expect, it } from 'vitest';
import { calculateHepaCadr } from '../src/utils/calculations';

describe('HEPA CADR Sizing Calculations', () => {
  it('accurately calculates room area and volume for a standard bedroom', () => {
    // 14 ft x 12 ft x 9.5 ft ceiling, target 4.5 ACH
    const result = calculateHepaCadr(14, 12, 9.5, 4.5);

    expect(result.areaSqFt).toBe(168); // 14 * 12
    expect(result.volumeCuFt).toBe(1596); // 168 * 9.5
    // Volume in m3: 1596 * 0.0283168 = 45.1936 m3 -> rounded to 45.2
    expect(result.volumeM3).toBeCloseTo(45.2, 1);

    // Recommended m3/h = 45.1936 * 4.5 = ~203 m3/h
    expect(result.recommendedCadrM3h).toBeGreaterThanOrEqual(200);
    expect(result.recommendedCadrM3h).toBeLessThanOrEqual(206);

    // Recommended CFM = ~203 / 1.699 = ~120 CFM
    expect(result.recommendedCadrCfm).toBeGreaterThanOrEqual(118);
    expect(result.recommendedCadrCfm).toBeLessThanOrEqual(122);
  });

  it('handles small rooms and enforces safe minimum dimensions', () => {
    // 2 ft x 3 ft room -> safe minimum area is clamped to 20 sq ft
    const result = calculateHepaCadr(2, 3, 5, 4);
    expect(result.areaSqFt).toBeGreaterThanOrEqual(20);
    expect(result.recommendedCadrM3h).toBeGreaterThan(0);
    expect(result.recommendedCadrCfm).toBeGreaterThan(0);
  });

  it('scales proportionally when ACH increases for high-smog episodes', () => {
    const lowAch = calculateHepaCadr(15, 15, 10, 3);
    const highAch = calculateHepaCadr(15, 15, 10, 6);

    // Doubling ACH should double the required CADR
    expect(highAch.recommendedCadrM3h).toBe(lowAch.recommendedCadrM3h * 2);
  });

  it('gracefully handles non-finite or negative inputs with sensible fallbacks', () => {
    const result = calculateHepaCadr(Number.NaN, -10, 0, Number.POSITIVE_INFINITY);
    expect(Number.isFinite(result.areaSqFt)).toBe(true);
    expect(Number.isFinite(result.recommendedCadrM3h)).toBe(true);
    expect(Number.isFinite(result.recommendedCadrCfm)).toBe(true);
  });
});
