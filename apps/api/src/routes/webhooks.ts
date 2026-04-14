/**
 * Clerk Webhook Handler
 * Syncs Clerk user lifecycle events into the Supabase `users` table.
 *
 * Verification: svix signatures using CLERK_WEBHOOK_SECRET env var.
 * Events handled:
 *   - user.created → INSERT with 5 starter credits
 *   - user.updated → UPDATE email / username / avatar_url
 */

import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { supabase } from '../index';

const router = Router();

// ---------------------------------------------------------------------------
// Types (lightweight – avoids pulling in the full @clerk/backend SDK)
// ---------------------------------------------------------------------------
interface ClerkEmailAddress {
  email_address: string;
  id: string;
}

interface ClerkUserPayload {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string;
  username: string | null;
  image_url: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface WebhookEvent {
  type: string;
  data: ClerkUserPayload;
}

// ---------------------------------------------------------------------------
// Helper – resolve primary e-mail from Clerk payload
// ---------------------------------------------------------------------------
function getPrimaryEmail(payload: ClerkUserPayload): string {
  const primary = payload.email_addresses.find(
    (e) => e.id === payload.primary_email_address_id
  );
  return primary?.email_address ?? payload.email_addresses[0]?.email_address ?? '';
}

// ---------------------------------------------------------------------------
// Helper – derive a display username
// ---------------------------------------------------------------------------
function deriveUsername(payload: ClerkUserPayload): string {
  if (payload.username) return payload.username;
  const parts = [payload.first_name, payload.last_name].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return `user_${payload.id.slice(-8)}`;
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/clerk
// ---------------------------------------------------------------------------
router.post('/clerk', async (req: Request, res: Response) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[webhooks/clerk] CLERK_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // --- Signature verification via svix ---
  const svixId        = req.headers['svix-id']        as string | undefined;
  const svixTimestamp = req.headers['svix-timestamp'] as string | undefined;
  const svixSignature = req.headers['svix-signature'] as string | undefined;

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  // rawBody is attached by the express.json verify callback in index.ts
  const rawBody: Buffer | undefined = (req as any).rawBody;
  if (!rawBody) {
    return res.status(400).json({ error: 'Raw body unavailable – check middleware config' });
  }

  let event: WebhookEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(rawBody.toString('utf8'), {
      'svix-id':        svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.warn('[webhooks/clerk] Signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const { type, data } = event;
  console.log(`[webhooks/clerk] Received event: ${type} for clerk_id=${data.id}`);

  try {
    if (type === 'user.created') {
      await handleUserCreated(data);
    } else if (type === 'user.updated') {
      await handleUserUpdated(data);
    } else {
      // Acknowledge but take no action for other event types
      console.log(`[webhooks/clerk] Unhandled event type: ${type}`);
    }
  } catch (err) {
    console.error(`[webhooks/clerk] Handler error for ${type}:`, err);
    return res.status(500).json({ error: 'Internal handler error' });
  }

  return res.status(200).json({ received: true, type });
});

// ---------------------------------------------------------------------------
// user.created handler
// ---------------------------------------------------------------------------
async function handleUserCreated(data: ClerkUserPayload): Promise<void> {
  const email      = getPrimaryEmail(data);
  const username   = deriveUsername(data);
  const avatar_url = data.image_url ?? null;

  const { error } = await supabase.from('users').insert({
    clerk_id:          data.id,
    email,
    username,
    avatar_url,
    credits_remaining: 5,
    tier:              'free',
    is_banned:         false,
  });

  if (error) {
    // Treat unique-violation (23505) as idempotent — webhook may fire twice
    if ((error as any).code === '23505') {
      console.warn(`[webhooks/clerk] user.created: duplicate clerk_id=${data.id} – skipping insert`);
      return;
    }
    throw new Error(`Supabase insert failed: ${error.message}`);
  }

  console.log(`[webhooks/clerk] user.created: inserted user clerk_id=${data.id} email=${email}`);
}

// ---------------------------------------------------------------------------
// user.updated handler
// ---------------------------------------------------------------------------
async function handleUserUpdated(data: ClerkUserPayload): Promise<void> {
  const email      = getPrimaryEmail(data);
  const username   = deriveUsername(data);
  const avatar_url = data.image_url ?? null;

  const { error } = await supabase
    .from('users')
    .update({ email, username, avatar_url, updated_at: new Date().toISOString() })
    .eq('clerk_id', data.id);

  if (error) {
    throw new Error(`Supabase update failed: ${error.message}`);
  }

  console.log(`[webhooks/clerk] user.updated: synced clerk_id=${data.id}`);
}

export default router;
