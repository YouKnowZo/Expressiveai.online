import { Router, Request, Response } from 'express';
import { supabase } from '../index';

const router = Router();

function makeCode(seed: string): string {
  return `EX-${seed.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;
}

router.get('/summary', async (req: Request, res: Response) => {
  const clerkId = typeof req.query.userId === 'string' ? req.query.userId : '';
  if (!clerkId) return res.status(400).json({ error: 'userId query parameter is required' });

  const { data: user } = await supabase
    .from('users')
    .select('id, referral_code, referral_count, referral_credits_earned')
    .eq('clerk_id', clerkId)
    .single();

  if (!user) return res.status(404).json({ error: 'User not found' });

  let referralCode = user.referral_code;
  if (!referralCode) {
    referralCode = makeCode(user.id);
    await supabase.from('users').update({ referral_code: referralCode }).eq('id', user.id);
  }

  const { data: rewardRows } = await supabase
    .from('referral_rewards')
    .select('reward_value, status')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  const pendingRewards = (rewardRows || []).filter((r) => r.status === 'pending').reduce((acc, r) => acc + (r.reward_value || 0), 0);
  const totalRewards = (rewardRows || []).reduce((acc, r) => acc + (r.reward_value || 0), 0);

  res.json({
    referralCode,
    referralLink: `https://expressiveai.online/sign-up?ref=${encodeURIComponent(referralCode)}`,
    referredUsers: user.referral_count || 0,
    earnedCredits: user.referral_credits_earned || 0,
    pendingRewards,
    totalRewards,
  });
});

router.post('/track-share', async (req: Request, res: Response) => {
  const { userId, videoId, channel } = req.body as { userId?: string; videoId?: string; channel?: string };
  if (!userId || !videoId) return res.status(400).json({ error: 'userId and videoId are required' });

  const { data: user } = await supabase.from('users').select('id').eq('clerk_id', userId).single();
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { data: video } = await supabase
    .from('videos')
    .select('id, share_count, user_id')
    .eq('id', videoId)
    .eq('user_id', user.id)
    .single();

  if (!video) return res.status(404).json({ error: 'Video not found' });

  await supabase
    .from('videos')
    .update({ share_count: (video.share_count || 0) + 1, is_public: true })
    .eq('id', videoId);

  await supabase.from('analytics_events').insert({
    user_id: user.id,
    event_type: 'video_shared',
    event_data: { videoId, channel: channel || 'unknown' },
  });

  res.json({ success: true });
});

export default router;
