import { Router, Request, Response } from 'express';
import { supabase } from '../index';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const router = Router();

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const videoQueue = new Queue('video-generation', { connection: redis });

const createBodySchema = z.object({
  prompt: z.string().trim().min(3, 'Prompt must be at least 3 characters').max(2000),
  negativePrompt: z.string().max(1000).optional(),
  length: z.coerce.number().int().min(5).max(60).optional().default(5),
  userId: z.string().min(1, 'userId is required'),
  isPublic: z.boolean().optional().default(false),
});

const BLOCKED = /child|minor|underage|cp|loli|gore|snuff|murder|torture/i;
const ARTISTIC = /artistic|fantasy|abstract|surreal|metaphor|mythological|stylized/i;

function moderatePromptContent(prompt: string): { allowed: boolean; reason?: string; isArtistic: boolean } {
  if (BLOCKED.test(prompt)) {
    return { allowed: false, reason: 'Illegal content detected per TOS.', isArtistic: false };
  }
  return { allowed: true, isArtistic: ARTISTIC.test(prompt) };
}

function maxSecondsForTier(tier: string | null | undefined): number {
  const t = (tier || 'free').toLowerCase();
  if (t === 'pro') return 30;
  if (t === 'creator' || t === 'enterprise') return 60;
  return 10;
}

async function logModerationBlock(prompt: string, reason: string | undefined, clerkId: string) {
  try {
    await supabase.from('moderation_queue').insert({
      prompt,
      reason,
      user_id: clerkId,
      blocked: true,
    });
  } catch {
    /* table may not exist in all environments */
  }
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      const first = Object.values(msg)[0]?.[0] || 'Invalid request';
      return res.status(400).json({ error: first });
    }

    const { prompt, negativePrompt, length, userId: clerkId, isPublic } = parsed.data;

    const { data: dbUser, error: userErr } = await supabase
      .from('users')
      .select('id, credits_remaining, tier, is_banned')
      .eq('clerk_id', clerkId)
      .single();

    if (userErr || !dbUser) {
      return res.status(404).json({
        error: 'Account not found. Complete sign-up or contact support to sync your profile.',
      });
    }

    if (dbUser.is_banned) {
      return res.status(403).json({ error: 'This account cannot create content.' });
    }

    const maxLen = maxSecondsForTier(dbUser.tier);
    if (length > maxLen) {
      return res.status(402).json({
        error: `Video length exceeds your plan limit (${maxLen}s max). Upgrade to create longer clips.`,
      });
    }

    const moderation = moderatePromptContent(prompt);
    if (!moderation.allowed) {
      await logModerationBlock(prompt, moderation.reason, clerkId);
      return res.status(400).json({ error: moderation.reason });
    }

    if (dbUser.credits_remaining < 1) {
      return res.status(429).json({ error: 'Insufficient credits. Upgrade to continue creating.' });
    }

    const videoId = uuidv4();
    const { error: insertErr } = await supabase.from('videos').insert({
      id: videoId,
      user_id: dbUser.id,
      prompt,
      negative_prompt: negativePrompt,
      length_seconds: length,
      is_public: isPublic,
      status: 'pending',
    });

    if (insertErr) {
      console.error('Video insert error:', insertErr);
      return res.status(500).json({ error: 'Failed to create video record' });
    }

    const { error: deductErr } = await supabase
      .from('users')
      .update({ credits_remaining: dbUser.credits_remaining - 1 })
      .eq('id', dbUser.id)
      .eq('credits_remaining', dbUser.credits_remaining);

    if (deductErr) {
      await supabase.from('videos').delete().eq('id', videoId);
      return res.status(500).json({ error: 'Could not reserve credits. Try again.' });
    }

    try {
      await videoQueue.add('generate', {
        videoId,
        prompt: moderation.isArtistic ? `[ARTISTIC LICENSE] ${prompt}` : prompt,
        negativePrompt,
        length,
        clerkId,
        dbUserId: dbUser.id,
        isArtistic: moderation.isArtistic,
      });
    } catch (queueError) {
      console.error('Queue error:', queueError);
      await supabase.from('users').update({ credits_remaining: dbUser.credits_remaining }).eq('id', dbUser.id);
      await supabase.from('videos').delete().eq('id', videoId);
      return res.status(503).json({ error: 'Generation queue unavailable. Credits were not consumed.' });
    }

    res.json({
      success: true,
      videoId,
      status: 'queued',
      estimatedTime: length * 2,
      artisticMode: moderation.isArtistic,
      message: moderation.isArtistic
        ? '🎨 Artistic mode activated — your unique vision is being created'
        : 'Your video is queued for generation',
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Failed to queue video generation' });
  }
});

router.get('/status/:videoId', async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const { data: video } = await supabase
    .from('videos')
    .select('status, video_url, thumbnail_url, error_message, progress')
    .eq('id', videoId)
    .single();

  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }

  res.json({
    status: video.status,
    videoUrl: video.video_url,
    thumbnailUrl: video.thumbnail_url,
    error: video.error_message,
    progress: video.progress ?? 0,
  });
});

router.get('/my-videos', async (req: Request, res: Response) => {
  const clerkId = typeof req.query.userId === 'string' ? req.query.userId : '';
  if (!clerkId) {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }

  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const { data: dbUser } = await supabase.from('users').select('id').eq('clerk_id', clerkId).single();
  if (!dbUser) {
    return res.json({ videos: [], total: 0 });
  }

  const { data: videos, count } = await supabase
    .from('videos')
    .select('*', { count: 'exact' })
    .eq('user_id', dbUser.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  res.json({ videos: videos ?? [], total: count ?? 0 });
});

router.get('/public', async (_req: Request, res: Response) => {
  const { data: videos } = await supabase
    .from('videos')
    .select('id, thumbnail_url, video_url, prompt, view_count')
    .eq('is_public', true)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(24);

  res.json({ videos: videos ?? [] });
});

export default router;
