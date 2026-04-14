import { Router, Request, Response } from 'express';
import { supabase } from '../index';
import { z } from 'zod';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/users/me?userId=<clerkId>
// Returns the authenticated user's full profile including live credit balance.
// ---------------------------------------------------------------------------
router.get('/me', async (req: Request, res: Response) => {
  const clerkId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
  if (!clerkId) {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select(
      'id, clerk_id, email, username, avatar_url, credits_remaining, tier, ' +
      'total_videos, is_banned, email_notifications, public_profile, created_at, updated_at'
    )
    .eq('clerk_id', clerkId)
    .single();

  if (error || !user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({
    id:                 user.id,
    clerkId:            user.clerk_id,
    email:              user.email,
    username:           user.username,
    avatarUrl:          user.avatar_url,
    creditsRemaining:   user.credits_remaining ?? 0,
    tier:               user.tier ?? 'free',
    totalVideos:        user.total_videos ?? 0,
    isBanned:           user.is_banned ?? false,
    emailNotifications: user.email_notifications ?? true,
    publicProfile:      user.public_profile ?? false,
    createdAt:          user.created_at,
    updatedAt:          user.updated_at,
  });
});

// ---------------------------------------------------------------------------
// POST /api/users/sync
// Manual upsert — call this to ensure a Clerk user exists in Supabase.
// Useful for re-sync after a missed webhook or during dev seeding.
// ---------------------------------------------------------------------------
const syncBodySchema = z.object({
  clerkId:   z.string().min(1),
  email:     z.string().email(),
  username:  z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

router.post('/sync', async (req: Request, res: Response) => {
  const parsed = syncBodySchema.safeParse(req.body);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ?? 'Invalid payload';
    return res.status(400).json({ error: first });
  }

  const { clerkId, email, username, avatarUrl } = parsed.data;

  // Derive a fallback username if none supplied
  const resolvedUsername = username?.trim() || `user_${clerkId.slice(-8)}`;

  const { data: existing } = await supabase
    .from('users')
    .select('id, credits_remaining')
    .eq('clerk_id', clerkId)
    .single();

  if (existing) {
    // Partial update — never overwrite credits on a re-sync
    const { error } = await supabase
      .from('users')
      .update({
        email,
        username:   resolvedUsername,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('clerk_id', clerkId);

    if (error) {
      console.error('[users/sync] Update error:', error);
      return res.status(500).json({ error: 'Failed to update user record' });
    }

    return res.json({ synced: true, action: 'updated', userId: existing.id });
  }

  // Insert new user with starter credits
  const { data: created, error: insertError } = await supabase
    .from('users')
    .insert({
      clerk_id:          clerkId,
      email,
      username:          resolvedUsername,
      avatar_url:        avatarUrl || null,
      credits_remaining: 5,
      tier:              'free',
      is_banned:         false,
    })
    .select('id')
    .single();

  if (insertError) {
    // Idempotent: ignore unique-violation and re-fetch
    if ((insertError as any).code === '23505') {
      const { data: fallback } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkId)
        .single();
      return res.json({ synced: true, action: 'noop', userId: fallback?.id ?? null });
    }
    console.error('[users/sync] Insert error:', insertError);
    return res.status(500).json({ error: 'Failed to create user record' });
  }

  return res.status(201).json({ synced: true, action: 'created', userId: created.id });
});

// ---------------------------------------------------------------------------
// PATCH /api/users/settings
// Update mutable preference fields for the authenticated user.
// ---------------------------------------------------------------------------
const settingsBodySchema = z.object({
  userId:             z.string().min(1),
  emailNotifications: z.boolean().optional(),
  publicProfile:      z.boolean().optional(),
});

router.patch('/settings', async (req: Request, res: Response) => {
  const parsed = settingsBodySchema.safeParse(req.body);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ?? 'Invalid payload';
    return res.status(400).json({ error: first });
  }

  const { userId: clerkId, emailNotifications, publicProfile } = parsed.data;

  // Build update object with only provided fields
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (emailNotifications !== undefined) updates.email_notifications = emailNotifications;
  if (publicProfile      !== undefined) updates.public_profile      = publicProfile;

  if (Object.keys(updates).length === 1) {
    return res.status(400).json({ error: 'No settings fields provided to update' });
  }

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('clerk_id', clerkId);

  if (error) {
    console.error('[users/settings] Update error:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }

  return res.json({ updated: true });
});

// ---------------------------------------------------------------------------
// GET /api/users  (backward-compat stub)
// ---------------------------------------------------------------------------
router.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'ExpressiveAI Users API',
    endpoints: [
      'GET  /api/users/me?userId=<clerkId>',
      'POST /api/users/sync',
      'PATCH /api/users/settings',
    ],
  });
});

export default router;
