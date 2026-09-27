import { describe, expect, it } from 'vitest';
import { createBodySchema, maxSecondsForTier } from './generate-schema';

describe('generate request validation', () => {
  it('applies duration caps for every tier', () => {
    expect(maxSecondsForTier('free')).toBe(10);
    expect(maxSecondsForTier('pro')).toBe(30);
    expect(maxSecondsForTier('creator')).toBe(300);
    expect(maxSecondsForTier('enterprise')).toBe(300);
    expect(maxSecondsForTier(undefined)).toBe(10);
  });

  it('accepts description as an alias for prompt', () => {
    const parsed = createBodySchema.parse({
      description: 'A cinematic skyline with rain and neon reflections',
      length: 10,
      isPublic: true,
    });

    expect(parsed.prompt).toBe('A cinematic skyline with rain and neon reflections');
    expect(parsed.length).toBe(10);
  });

  it('accepts a five-minute video duration', () => {
    const parsed = createBodySchema.parse({
      prompt: 'A calm ocean at golden hour',
      length: 300,
    });

    expect(parsed.length).toBe(300);
  });

  it('rejects durations longer than five minutes', () => {
    const parsed = createBodySchema.safeParse({
      prompt: 'A calm ocean at golden hour',
      length: 301,
    });

    expect(parsed.success).toBe(false);
  });

  it('keeps the established prompt field working', () => {
    const parsed = createBodySchema.parse({
      prompt: 'A warm sunrise over a mountain lake',
    });

    expect(parsed.prompt).toBe('A warm sunrise over a mountain lake');
    expect(parsed.length).toBe(5);
  });
});
