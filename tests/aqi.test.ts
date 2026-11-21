import { describe, expect, it } from 'vitest';
import {
  calculateCpcbAqi,
  calculateCpcbSubIndex,
  getCpcbCategory,
  getUsAqiCategory,
} from '../src/utils/aqi';
import type { AirQualityMetrics } from '../src/types/freshair';

describe('US AQI Breakpoints & Categories', () => {
  it('categorizes null and non-finite values as unavailable', () => {
    expect(getUsAqiCategory(null).level).toBe('unavailable');
    expect(getUsAqiCategory(Number.NaN).level).toBe('unavailable');
  });

  it('categorizes 0–50 as Good', () => {
    expect(getUsAqiCategory(0).level).toBe('good');
    expect(getUsAqiCategory(25).level).toBe('good');
    expect(getUsAqiCategory(50).level).toBe('good');
    expect(getUsAqiCategory(50).label).toBe('Good');
  });

  it('categorizes 51–100 as Moderate', () => {
    expect(getUsAqiCategory(51).level).toBe('moderate');
    expect(getUsAqiCategory(100).level).toBe('moderate');
  });

  it('categorizes 101–150 as Sensitive', () => {
    expect(getUsAqiCategory(101).level).toBe('sensitive');
    expect(getUsAqiCategory(150).level).toBe('sensitive');
  });

  it('categorizes 151–200 as Unhealthy', () => {
    expect(getUsAqiCategory(151).level).toBe('unhealthy');
    expect(getUsAqiCategory(200).level).toBe('unhealthy');
  });

  it('categorizes 201–300 as Very Unhealthy', () => {
    expect(getUsAqiCategory(201).level).toBe('very_unhealthy');
    expect(getUsAqiCategory(300).level).toBe('very_unhealthy');
  });

  it('categorizes >300 as Hazardous (not Severe)', () => {
    expect(getUsAqiCategory(301).level).toBe('hazardous');
    expect(getUsAqiCategory(301).label).toBe('Hazardous');
    expect(getUsAqiCategory(450).level).toBe('hazardous');
    expect(getUsAqiCategory(500).label).toBe('Hazardous');
  });
});

describe('CPCB National AQI Calculation & Methodology', () => {
  describe('CPCB Sub-Index Calculations', () => {
    it('calculates PM2.5 sub-indices accurately at official breakpoints', () => {
      // 0..30 -> 0..50
      expect(calculateCpcbSubIndex('pm25', 0)).toBe(0);
      expect(calculateCpcbSubIndex('pm25', 30)).toBe(50);
      // 31..60 -> 51..100
      expect(calculateCpcbSubIndex('pm25', 60)).toBe(100);
      // 61..90 -> 101..200
      expect(calculateCpcbSubIndex('pm25', 90)).toBe(200);
      // 91..120 -> 201..300
      expect(calculateCpcbSubIndex('pm25', 120)).toBe(300);
      // 121..250 -> 301..400
      expect(calculateCpcbSubIndex('pm25', 250)).toBe(400);
      // 251..380 -> 401..500
      expect(calculateCpcbSubIndex('pm25', 380)).toBe(500);
      // Above top breakpoint clamped to 500
      expect(calculateCpcbSubIndex('pm25', 600)).toBe(500);
    });

    it('calculates PM10 sub-indices accurately at official breakpoints', () => {
      expect(calculateCpcbSubIndex('pm10', 0)).toBe(0);
      expect(calculateCpcbSubIndex('pm10', 50)).toBe(50);
      expect(calculateCpcbSubIndex('pm10', 100)).toBe(100);
      expect(calculateCpcbSubIndex('pm10', 250)).toBe(200);
      expect(calculateCpcbSubIndex('pm10', 350)).toBe(300);
      expect(calculateCpcbSubIndex('pm10', 430)).toBe(400);
      expect(calculateCpcbSubIndex('pm10', 500)).toBe(500);
    });

    it('calculates NO2 sub-indices accurately', () => {
      expect(calculateCpcbSubIndex('no2', 40)).toBe(50);
      expect(calculateCpcbSubIndex('no2', 80)).toBe(100);
      expect(calculateCpcbSubIndex('no2', 180)).toBe(200);
    });

    it('calculates CO sub-indices on mg/m3 scale', () => {
      // 0..1.0 mg/m3 -> 0..50
      expect(calculateCpcbSubIndex('co', 1.0)).toBe(50);
      // 1.1..2.0 mg/m3 -> 51..100
      expect(calculateCpcbSubIndex('co', 2.0)).toBe(100);
      // 2.1..10.0 mg/m3 -> 101..200
      expect(calculateCpcbSubIndex('co', 10.0)).toBe(200);
    });

    it('returns null for unknown pollutant or negative values', () => {
      expect(calculateCpcbSubIndex('unknown_gas', 50)).toBeNull();
      expect(calculateCpcbSubIndex('pm25', -10)).toBeNull();
    });
  });

  describe('CPCB Data Adequacy Requirements', () => {
    const baseSample: AirQualityMetrics = {
      usAqi: 120,
      europeanAqi: 45,
      pm25: null,
      pm10: null,
      no2: null,
      o3: null,
      so2: null,
      co: null,
      dust: null,
      uvIndex: null,
      measuredAt: '2026-11-21T12:00:00Z',
      source: 'Open-Meteo',
      status: 'ok',
    };

    it('refuses to compute official CPCB AQI when entire feed is null', () => {
      const res = calculateCpcbAqi(null);
      expect(res.isComplete).toBe(false);
      expect(res.aqi).toBeNull();
      expect(res.category.level).toBe('insufficient_data');
      expect(res.missingRequirements.length).toBeGreaterThan(0);
    });

    it('refuses to compute official CPCB AQI when fewer than 3 pollutants are monitored', () => {
      const partial: AirQualityMetrics = {
        ...baseSample,
        pm25: 45, // 1st pollutant
        no2: 25,  // 2nd pollutant
      };
      const res = calculateCpcbAqi(partial);
      expect(res.isComplete).toBe(false);
      expect(res.aqi).toBeNull();
      expect(res.monitoredCount).toBe(2);
      expect(res.missingRequirements[0]).toContain('requires ≥3 monitored pollutants');
      // Sub-indices for available measurements are still transparently preserved
      expect(res.subIndices.pm25).toBeDefined();
      expect(res.subIndices.no2).toBeDefined();
    });

    it('refuses to compute official CPCB AQI when 3 pollutants exist but neither PM2.5 nor PM10 is monitored', () => {
      const noParticulate: AirQualityMetrics = {
        ...baseSample,
        no2: 30, // 1
        so2: 15, // 2
        o3: 40,  // 3
      };
      const res = calculateCpcbAqi(noParticulate);
      expect(res.isComplete).toBe(false);
      expect(res.aqi).toBeNull();
      expect(res.monitoredCount).toBe(3);
      expect(res.hasRequiredParticulate).toBe(false);
      expect(res.missingRequirements.some((r) => r.includes('particulate matter'))).toBe(true);
    });

    it('computes official CPCB AQI and dominant pollutant when 3 pollutants including PM2.5 are present', () => {
      const valid3: AirQualityMetrics = {
        ...baseSample,
        pm25: 75, // Sub-index: ~150 (Moderate)
        no2: 35,  // Sub-index: ~44 (Good)
        so2: 20,  // Sub-index: ~25 (Good)
      };
      const res = calculateCpcbAqi(valid3);
      expect(res.isComplete).toBe(true);
      expect(res.aqi).toBeGreaterThanOrEqual(140);
      expect(res.aqi).toBeLessThanOrEqual(160);
      expect(res.dominantPollutant?.code).toBe('pm25');
      expect(res.category.level).toBe('moderate');
      expect(res.missingRequirements).toHaveLength(0);
    });

    it('accurately identifies dominant pollutant when a gas has the highest sub-index', () => {
      const gasDominant: AirQualityMetrics = {
        ...baseSample,
        pm25: 20,  // Sub-index: ~33 (Good)
        pm10: 40,  // Sub-index: ~40 (Good)
        no2: 220,  // Sub-index: ~240 (Poor)
      };
      const res = calculateCpcbAqi(gasDominant);
      expect(res.isComplete).toBe(true);
      expect(res.dominantPollutant?.code).toBe('no2');
      expect(res.aqi).toBeGreaterThanOrEqual(230);
      expect(res.category.level).toBe('poor');
    });

    it('correctly converts CO from µg/m3 to mg/m3 before sub-index evaluation', () => {
      const withCo: AirQualityMetrics = {
        ...baseSample,
        pm25: 25,
        no2: 30,
        co: 1500, // 1500 µg/m3 = 1.5 mg/m3 -> Satisfactory (sub-index ~73)
      };
      const res = calculateCpcbAqi(withCo);
      expect(res.isComplete).toBe(true);
      expect(res.subIndices.co.concentration).toBe(1.5);
      expect(res.subIndices.co.unit).toBe('mg/m³');
      expect(res.subIndices.co.subIndex).toBeGreaterThanOrEqual(70);
      expect(res.subIndices.co.subIndex).toBeLessThanOrEqual(80);
    });
  });

  describe('CPCB Categories', () => {
    it('maps official CPCB categories across 0–500 scale', () => {
      expect(getCpcbCategory(30).level).toBe('good');
      expect(getCpcbCategory(75).level).toBe('satisfactory');
      expect(getCpcbCategory(150).level).toBe('moderate');
      expect(getCpcbCategory(250).level).toBe('poor');
      expect(getCpcbCategory(350).level).toBe('very_poor');
      expect(getCpcbCategory(420).level).toBe('severe');
    });
  });
});
