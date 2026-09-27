import { z } from 'zod';

export function maxSecondsForTier(tier: string | null | undefined): number {
  const normalizedTier = (tier || 'free').toLowerCase();
  if (normalizedTier === 'pro') return 30;
  if (normalizedTier === 'creator' || normalizedTier === 'enterprise') return 300;
  return 10;
}

export const createBodySchema = z
  .object({
    prompt: z.string().trim().min(3, 'Prompt must be at least 3 characters').max(2000).optional(),
    description: z.string().trim().min(3, 'Description must be at least 3 characters').max(2000).optional(),
    negativePrompt: z.string().max(1000).optional(),
    length: z.coerce.number().int().min(5).max(300).optional().default(5),
    isPublic: z.boolean().optional().default(false),
  })
  .transform(({ prompt, description, ...rest }) => ({
    ...rest,
    prompt: (prompt ?? description ?? '').trim(),
  }))
  .refine((data) => !!data.prompt, {
    message: 'Prompt must be at least 3 characters',
    path: ['prompt'],
  })
  .transform((data) => ({
    ...data,
    prompt: data.prompt.trim(),
  }));
