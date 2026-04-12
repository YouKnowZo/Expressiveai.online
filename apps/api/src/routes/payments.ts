import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { supabase } from '../index';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const router = Router();
const DOMAIN = process.env.FRONTEND_URL || 'http://localhost:3000';

router.post('/create-checkout-session', async (req: Request, res: Response) => {
  const { userId, planId } = req.body; 

  if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }

  const plans: Record<string, { price: number, credits: number, name: string }> = {
    'starter_50': { price: 500, credits: 50, name: '50 Credits (Starter)' },
    'pro_200': { price: 1500, credits: 200, name: '200 Credits (Pro)' },
  };

  const plan = plans[planId as string];
  if (!plan) return res.status(400).json({ error: 'Invalid plan selected' });

  try {
    const session = await stripe.checkout.sessions.create({
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
      metadata: { userId, credits: plan.credits.toString() },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/webhook', async (req: any, res: Response) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody, 
      sig as string, 
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const creditsToAdd = parseInt(session.metadata?.credits || '0', 10);

    if (userId && creditsToAdd > 0) {
      const { data: user } = await supabase
        .from('users')
        .select('credits_remaining, id')
        .eq('clerk_id', userId)
        .single();
        
      if (user) {
        await supabase
          .from('users')
          .update({ credits_remaining: user.credits_remaining + creditsToAdd })
          .eq('clerk_id', userId);
      } else {
        await supabase
          .from('users')
          .insert({
            clerk_id: userId,
            email: session.customer_details?.email || 'unknown',
            credits_remaining: creditsToAdd + 5,
          });
      }
      
      await supabase.from('payments').insert({
        user_id: user?.id || null,
        stripe_session_id: session.id,
        amount_cents: session.amount_total,
        status: 'completed'
      });
    }
  }

  res.send();
});

export default router;
