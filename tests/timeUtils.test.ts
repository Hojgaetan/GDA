import { describe, it, expect } from 'vitest';
import { parseTimeHHMM, durationMinutes, formatMinutes } from '../services/timeUtils';

describe('timeUtils', () => {
  describe('parseTimeHHMM', () => {
    it('parse des heures valides', () => {
      expect(parseTimeHHMM('00:00')).toBe(0);
      expect(parseTimeHHMM('09:05')).toBe(9 * 60 + 5);
      expect(parseTimeHHMM('23:59')).toBe(23 * 60 + 59);
    });
    it('rejette des heures invalides', () => {
      for (const v of ['24:00', '12:60', '99:99', 'ab:cd', '', '7:5']) {
        expect(() => parseTimeHHMM(v)).toThrow();
      }
    });
  });

  describe('durationMinutes', () => {
    it('calcule la durée simple', () => {
      expect(durationMinutes('09:00', '10:30')).toBe(90);
    });
    it('refuse fin < début sans passage minuit', () => {
      expect(() => durationMinutes('10:00', '09:59')).toThrow();
    });
    it('gère le passage minuit si autorisé', () => {
      expect(durationMinutes('23:00', '01:00', { allowOverMidnight: true })).toBe(120);
    });
  });

  describe('formatMinutes', () => {
    it('formate correctement', () => {
      expect(formatMinutes(0)).toBe('0h00');
      expect(formatMinutes(5)).toBe('0h05');
      expect(formatMinutes(65)).toBe('1h05');
    });
    it('gère les valeurs négatives et non finies', () => {
      expect(formatMinutes(-1)).toBe('0h00');
      expect(formatMinutes(Number.NaN as unknown as number)).toBe('0h00');
    });
  });
});

