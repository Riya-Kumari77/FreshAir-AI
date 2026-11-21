import { describe, expect, it } from 'vitest';
import { calculateTripSavingsKg } from '../src/utils/calculations';

describe('Transport Emissions Calculations', () => {
  it('calculates CO2 savings when switching from petrol car to metro rail', () => {
    // Petrol car: 160 g CO2/km, Metro rail: 28 g CO2/km, Distance: 15 km
    // Delta: 132 g/km -> 15 * 132 / 1000 = 1.98 kg
    const saved = calculateTripSavingsKg(15, 160, 28);
    expect(saved).toBe(1.98);
  });

  it('calculates full savings when switching from petrol car to walking or cycling', () => {
    // Petrol car: 160 g CO2/km, Walk: 0 g CO2/km, Distance: 8 km
    // Delta: 160 g/km -> 8 * 160 / 1000 = 1.28 kg
    const saved = calculateTripSavingsKg(8, 160, 0);
    expect(saved).toBe(1.28);
  });

  it('calculates two-wheeler to electric bus savings', () => {
    // Two wheeler: 72 g CO2/km, Electric bus: 18 g CO2/km, Distance: 20 km
    // Delta: 54 g/km -> 20 * 54 / 1000 = 1.08 kg
    const saved = calculateTripSavingsKg(20, 72, 18);
    expect(saved).toBe(1.08);
  });

  it('returns 0 when alternative emits more than baseline (no negative savings)', () => {
    // Baseline: Cycle (0 g/km), Alternative: Diesel Car (175 g/km)
    const saved = calculateTripSavingsKg(10, 0, 175);
    expect(saved).toBe(0);
  });

  it('handles zero or negative distances safely', () => {
    expect(calculateTripSavingsKg(0, 160, 28)).toBe(0);
    expect(calculateTripSavingsKg(-15, 160, 28)).toBe(0);
  });

  it('handles non-finite values safely', () => {
    expect(calculateTripSavingsKg(Number.NaN, 160, 28)).toBe(0);
    expect(calculateTripSavingsKg(15, Number.NaN, 28)).toBe(0);
  });
});
