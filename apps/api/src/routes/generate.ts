import { Router, Request, Response } from 'express';
import { supabase } from '../index';
import { HfInference } from '@huggingface/inference';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const hf = new HfInference(process.env.HF_TOKEN || '');

// Redis connection for queue
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const videoQueue = new Queue('video-generation', { connection: redis });

// Advanced Moderation
const BLOCKED = /child|minor|underage|cp|loli|gore|snuff|murder|torture/i;
const ARTISTIC = /artistic|fantasy|abstract|surreal|metaphor|mythological|stylized/i;

function moderatePromptContent(prompt: string): { allowed: boolean; reason?: string; isArtistic: boolean } {
  if (BLOCKED.test(prompt)) {
    return { allowed: false, reason: 'Illegal content detected per TOS.', isArtistic: false };
  }

  const isArtistic = ARTISTIC.test(prompt);
  return { allowed: true, isArtistic };
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { prompt, negativePrompt, length = 5, userId, isPublic = false } = req.body;

    if (!prompt || prompt.length < 3) {
      return res.status(400).json({ error: 'Prompt must be at least 3 characters' });
    }

    if (length > (userId === 'free' ? 10 : userId === 'pro' ? 30 : 60)) {
      return res.status(402).json({ error: 'Video length exceeds your plan limits' });
    }

    // Moderation
    const moderation = moderatePromptContent(prompt);
    if (!moderation.allowed) {
      await supabase.from('moderation_logs').insert({
        prompt,
        reason: moderation.reason,
        user_id: userId,
        blocked: true
      });
      return res.status(400).json({ error: moderation.reason });
    }

    // Check credits
    const { data: user } = await supabase
      .from('users')
      .select('credits_remaining, tier')
      .eq('clerk_id', userId)
      .single();

    if (!user || user.credits_remaining < 1) {
      return res.status(429).json({ error: 'Insufficient credits. Upgrade to continue creating.' });
    }

    // Create video record
    const videoId = uuidv4();
    await supabase.from('videos').insert({
      id: videoId,
      user_id: userId,
      prompt,
      negative_prompt: negativePrompt,
      length_seconds: length,
      is_public: isPublic,
      status: 'pending'
    });

    // Deduct credit
    await supabase
      .from('users')
      .update({ credits_remaining: user.credits_remaining - 1 })
      .eq('clerk_id', userId);

    // Add to queue
    await videoQueue.add('generate', {
      videoId,
      prompt: moderation.isArtistic ? `[ARTISTIC LICENSE] ${prompt}` : prompt,
      negativePrompt,
      length,
      userId,
      isArtistic: moderation.isArtistic
    });

    res.json({
      success: true,
      videoId,
      status: 'queued',
      estimatedTime: length * 2,
      artisticMode: moderation.isArtistic,
      message: moderation.isArtistic 
        ? "🎨 Artistic mode activated — your unique vision is being created" 
        : "Your video is queued for generation"
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
    progress: video.progress || 0
  });
});

router.get('/my-videos', async (req: Request, res: Response) => {
  const { userId, limit = 20, offset = 0 } = req.query;
  const { data: videos, count } = await supabase
    .from('videos')
    .select('*', { count: 'exact' })
    .eq('user_id', userId as string)
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  res.json({ videos, total: count });
});

export default router;
