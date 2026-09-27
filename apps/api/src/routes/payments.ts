import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { supabase } from '../index';
import { authenticatedClerkId } from '../auth';

const router = Router();

const creditPlans: Record<string, { price: number; credits: number; name: string; tier: 'free' | 'pro' | 'creator' }> = {
  starter_50: { price: 500, credits: 50, name: '50 Credits (Starter)', tier: 'free' },
  pro_200: { price: 1500, credits: 200, name: '200 Credits (Pro)', tier: 'pro' },
  creator_1000: { price: 4900, credits: 1000, name: '1,000 Credits (Creator)', tier: 'creator' },
};

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('Stripe checkout is not configured. Set STRIPE_SECRET_KEY.');
  return new Stripe(secretKey);
}
const DOMAIN = process.env.FRONTEND_URL || 'http://localhost:3000';

router.post('/create-checkout-session', async (req: Request, res: Response) => {
  const userId = await authenticatedClerkId(req, res);
  if (!userId) return;
  const { planId } = req.body;

  const plan = creditPlans[planId as string];
  if (!plan) return res.status(400).json({ error: 'Invalid plan selected' });

  try {
    const { data: account, error: accountError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .maybeSingle();
    if (accountError || !account) return res.status(404).json({ error: 'Account not found.' });

    const session = await getStripe().checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: plan.name },
            unit_amount: plan.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${DOMAIN}/dashboard?success=true`,
      cancel_url: `${DOMAIN}/pricing?canceled=true`,
      metadata: { userId, planId: planId as string, credits: plan.credits.toString() },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error('[payments/checkout] Checkout session creation failed:', err);
    res.status(500).json({ error: 'Unable to start checkout right now. Please try again.' });
  }
});

router.post('/webhook', async (req: any, res: Response) => {
  const sig = req.headers['stripe-signature'];

  let event: Stripe.Event;
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(500).json({ error: 'Stripe webhook is not configured.' });
    event = getStripe().webhooks.constructEvent(
      req.rawBody,
      sig as string,
      webhookSecret,
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    const plan = planId ? creditPlans[planId] : undefined;

    // Never grant credits until Stripe confirms the session is paid. The plan
    // amount is resolved server-side rather than trusting webhook metadata.
    if (session.payment_status !== 'paid') return res.status(200).json({ received: true, pending: true });
    if (!userId || !plan || session.amount_total !== plan.price) {
      console.error(`[payments/webhook] Invalid paid checkout metadata for session ${session.id}`);
      return res.status(400).json({ error: 'Paid checkout metadata did not match a known credit pack.' });
    }

    const { error: fulfillError } = await supabase.rpc('fulfill_credit_purchase', {
      p_clerk_id: userId,
      p_session_id: session.id,
      p_credits: plan.credits,
      p_amount_cents: session.amount_total,
      p_tier: plan.tier,
    });
    if (fulfillError) {
      console.error('[payments/webhook] Credit fulfillment failed:', fulfillError);
      return res.status(500).json({ error: 'Could not fulfill paid credit pack.' });
    }
  }

  res.send();
});

export default router;
