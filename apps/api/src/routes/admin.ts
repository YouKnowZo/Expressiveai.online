import { Router, Request, Response } from 'express';
import { supabase } from '../index';

const router = Router();

function isAdmin(clerkId: string): boolean {
  const configured = (process.env.ADMIN_CLERK_IDS || '').split(',').map((v) => v.trim()).filter(Boolean);
  return configured.includes(clerkId);
}

router.get('/overview', async (req: Request, res: Response) => {
  const clerkId = typeof req.query.userId === 'string' ? req.query.userId : '';
  if (!clerkId || !isAdmin(clerkId)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const [usersCount, videosCount, pendingCount, completedCount, failedCount, publicCount] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('videos').select('id', { count: 'exact', head: true }),
    supabase.from('videos').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('videos').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('videos').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase.from('videos').select('id', { count: 'exact', head: true }).eq('is_public', true),
  ]);

  const { data: costRows } = await supabase
    .from('videos')
    .select('cost_credits')
    .order('created_at', { ascending: false })
    .limit(200);

  const totalCost = (costRows || []).reduce((acc, row) => acc + (row.cost_credits || 1), 0);

  res.json({
    totalUsers: usersCount.count || 0,
    totalVideos: videosCount.count || 0,
    pendingVideos: pendingCount.count || 0,
    completedVideos: completedCount.count || 0,
    failedVideos: failedCount.count || 0,
    publicVideos: publicCount.count || 0,
    avgCostPerVideoCredits: (costRows || []).length ? Number((totalCost / (costRows || []).length).toFixed(2)) : 0,
  });
});

router.get('/videos', async (req: Request, res: Response) => {
  const clerkId = typeof req.query.userId === 'string' ? req.query.userId : '';
  if (!clerkId || !isAdmin(clerkId)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const limit = Math.min(Number(req.query.limit) || 30, 100);

  let query = supabase
    .from('videos')
    .select('id, user_id, prompt, status, is_public, share_count, cost_credits, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);

  const { data } = await query;
  res.json({ videos: data || [] });
});

router.post('/videos/:videoId/public', async (req: Request, res: Response) => {
  const { userId, isPublic } = req.body as { userId?: string; isPublic?: boolean };
  if (!userId || !isAdmin(userId)) return res.status(403).json({ error: 'Admin access required' });

  await supabase.from('videos').update({ is_public: Boolean(isPublic) }).eq('id', req.params.videoId);
  res.json({ success: true });
});

export default router;
