import { describe, expect, it } from 'vitest';
import { createBodySchema } from './generate-schema';

describe('generate request validation', () => {
  it('accepts description as an alias for prompt', () => {
    const parsed = createBodySchema.parse({
      description: 'A cinematic skyline with rain and neon reflections',
      userId: 'user_123',
      length: 10,
      isPublic: true,
    });

    expect(parsed.prompt).toBe('A cinematic skyline with rain and neon reflections');
    expect(parsed.length).toBe(10);
  });

  it('keeps the established prompt field working', () => {
    const parsed = createBodySchema.parse({
      prompt: 'A warm sunrise over a mountain lake',
      userId: 'user_456',
    });

    expect(parsed.prompt).toBe('A warm sunrise over a mountain lake');
    expect(parsed.length).toBe(5);
  });
});
