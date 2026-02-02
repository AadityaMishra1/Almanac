import { describe, it, expect } from 'vitest';
import { adjustConfidence } from '@/lib/events/categorize';
import { EventWithConfidence } from '@/lib/events/types';

describe('adjustConfidence', () => {
  it('should not change confidence for valid event', () => {
    const event: EventWithConfidence = {
      title: 'Midterm Exam',
      date: '2026-03-16', // Monday
      type: 'exam',
      description: '',
      confidence: {
        overall: 0.9,
        date_extracted: true,
        type_inferred: false,
        reasoning: '',
      },
    };

    const result = adjustConfidence(event, 'Spring 2026');
    expect(result.confidence.overall).toBe(0.9);
    expect(result.confidence.reasoning).toBe('');
  });

  it('should reduce confidence for date outside semester', () => {
    const event: EventWithConfidence = {
      title: 'Summer Assignment',
      date: '2026-07-15',
      type: 'assignment',
      description: '',
      confidence: {
        overall: 0.9,
        date_extracted: true,
        type_inferred: false,
        reasoning: '',
      },
    };

    const result = adjustConfidence(event, 'Spring 2026');
    expect(result.confidence.overall).toBeLessThan(0.9);
    expect(result.confidence.overall).toBe(0.6); // 0.9 - 0.3 = 0.6
    expect(result.confidence.reasoning).toContain('outside');
  });

  it('should reduce confidence for inferred type', () => {
    const event: EventWithConfidence = {
      title: 'Assignment',
      date: '2026-03-16', // Monday
      type: 'assignment',
      description: '',
      confidence: {
        overall: 0.9,
        date_extracted: true,
        type_inferred: true,
        reasoning: '',
      },
    };

    const result = adjustConfidence(event, 'Spring 2026');
    expect(result.confidence.overall).toBe(0.8); // 0.9 - 0.1 = 0.8
    expect(result.confidence.reasoning).toContain('type was inferred');
  });

  it('should reduce confidence for date not extracted', () => {
    const event: EventWithConfidence = {
      title: 'Quiz',
      date: '2026-03-16', // Monday
      type: 'quiz',
      description: '',
      confidence: {
        overall: 0.9,
        date_extracted: false,
        type_inferred: false,
        reasoning: '',
      },
    };

    const result = adjustConfidence(event, 'Spring 2026');
    expect(result.confidence.overall).toBe(0.7); // 0.9 - 0.2 = 0.7
    expect(result.confidence.reasoning).toContain('Date was inferred');
  });

  it('should reduce confidence for weekend date', () => {
    const event: EventWithConfidence = {
      title: 'Weekend Event',
      date: '2026-03-14', // Saturday
      type: 'exam',
      description: '',
      confidence: {
        overall: 0.9,
        date_extracted: true,
        type_inferred: false,
        reasoning: '',
      },
    };

    const result = adjustConfidence(event, 'Spring 2026');
    expect(result.confidence.overall).toBe(0.85); // 0.9 - 0.05 = 0.85
    expect(result.confidence.reasoning).toContain('weekend');
  });

  it('should stack multiple adjustments', () => {
    const event: EventWithConfidence = {
      title: 'Event',
      date: '2026-03-16', // Monday
      type: 'assignment',
      description: '',
      confidence: {
        overall: 0.9,
        date_extracted: false,
        type_inferred: true,
        reasoning: '',
      },
    };

    const result = adjustConfidence(event, 'Spring 2026');
    expect(result.confidence.overall).toBe(0.6); // 0.9 - 0.2 - 0.1 = 0.6
    expect(result.confidence.reasoning).toContain('Date was inferred');
    expect(result.confidence.reasoning).toContain('type was inferred');
  });

  it('should not go below 0', () => {
    const event: EventWithConfidence = {
      title: 'Event',
      date: '2026-07-15', // Outside semester
      type: 'assignment',
      description: '',
      confidence: {
        overall: 0.2,
        date_extracted: false,
        type_inferred: true,
        reasoning: '',
      },
    };

    const result = adjustConfidence(event, 'Spring 2026');
    expect(result.confidence.overall).toBeGreaterThanOrEqual(0);
    expect(result.confidence.overall).toBe(0); // 0.2 - 0.3 - 0.2 - 0.1 = -0.4 -> 0
  });

  it('should not exceed 1', () => {
    const event: EventWithConfidence = {
      title: 'Event',
      date: '2026-03-15',
      type: 'exam',
      description: '',
      confidence: {
        overall: 1.5, // Invalid input
        date_extracted: true,
        type_inferred: false,
        reasoning: '',
      },
    };

    const result = adjustConfidence(event, 'Spring 2026');
    expect(result.confidence.overall).toBeLessThanOrEqual(1);
  });

  it('should preserve existing reasoning', () => {
    const event: EventWithConfidence = {
      title: 'Event',
      date: '2026-03-16', // Monday
      type: 'assignment',
      description: '',
      confidence: {
        overall: 0.9,
        date_extracted: false,
        type_inferred: false,
        reasoning: 'Initial reason',
      },
    };

    const result = adjustConfidence(event, 'Spring 2026');
    expect(result.confidence.reasoning).toContain('Initial reason');
    expect(result.confidence.reasoning).toContain('Date was inferred');
  });
});
