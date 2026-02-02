import { z } from 'zod';

export const ConfidenceScoreSchema = z.object({
  overall: z.number().min(0).max(1),
  date_extracted: z.boolean(),
  type_inferred: z.boolean(),
  reasoning: z.string().optional().default(''),
});

export type ConfidenceScore = z.infer<typeof ConfidenceScoreSchema>;

export const EventWithConfidenceSchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  type: z.enum(['exam', 'quiz', 'assignment', 'reading', 'project', 'lab']),
  description: z.string().optional().default(''),
  confidence: ConfidenceScoreSchema,
});

export type EventWithConfidence = z.infer<typeof EventWithConfidenceSchema>;

export interface ExtractionMetadata {
  method: 'text' | 'ocr';
  pageCount: number;
  totalEvents: number;
  highConfidence: number;  // count of events with confidence >= 0.85
  needsReview: number;     // count of events with confidence < 0.6
}
