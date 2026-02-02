import { describe, it, expect } from 'vitest';
import { validateEventDate, SEMESTER_BOUNDS } from '@/lib/events/validate';

describe('validateEventDate', () => {
  describe('Spring 2026 validation', () => {
    it('should accept valid date within Spring 2026', () => {
      const result = validateEventDate('2026-03-15', 'Spring 2026');
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should accept exact start date (2026-01-12)', () => {
      const result = validateEventDate('2026-01-12', 'Spring 2026');
      expect(result.valid).toBe(true);
    });

    it('should accept exact end date (2026-05-15)', () => {
      const result = validateEventDate('2026-05-15', 'Spring 2026');
      expect(result.valid).toBe(true);
    });

    it('should reject date before semester start', () => {
      const result = validateEventDate('2026-01-10', 'Spring 2026');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('outside');
      expect(result.reason).toContain('Spring 2026');
    });

    it('should reject date after semester end', () => {
      const result = validateEventDate('2026-05-16', 'Spring 2026');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('outside');
      expect(result.reason).toContain('Spring 2026');
    });
  });

  describe('Fall 2026 validation', () => {
    it('should accept valid date within Fall 2026', () => {
      const result = validateEventDate('2026-10-15', 'Fall 2026');
      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid inputs', () => {
    it('should reject invalid date string', () => {
      const result = validateEventDate('not-a-date', 'Spring 2026');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid date');
    });

    it('should reject unknown semester', () => {
      const result = validateEventDate('2026-03-15', 'Winter 2026');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Unknown semester');
    });
  });

  describe('Summer 2026 validation', () => {
    it('should accept valid date within Summer 2026', () => {
      const result = validateEventDate('2026-07-15', 'Summer 2026');
      expect(result.valid).toBe(true);
    });
  });
});

describe('SEMESTER_BOUNDS', () => {
  it('should have Spring 2026 bounds', () => {
    expect(SEMESTER_BOUNDS['Spring 2026']).toBeDefined();
    expect(SEMESTER_BOUNDS['Spring 2026'].start).toEqual('2026-01-12');
    expect(SEMESTER_BOUNDS['Spring 2026'].end).toEqual('2026-05-15');
  });

  it('should have Summer 2026 bounds', () => {
    expect(SEMESTER_BOUNDS['Summer 2026']).toBeDefined();
  });

  it('should have Fall 2026 bounds', () => {
    expect(SEMESTER_BOUNDS['Fall 2026']).toBeDefined();
  });
});
