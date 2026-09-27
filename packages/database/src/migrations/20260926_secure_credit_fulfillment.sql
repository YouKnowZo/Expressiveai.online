-- Apply this migration in Supabase before enabling Stripe credit fulfillment.
-- Stripe can redeliver webhook events; session IDs must only be fulfilled once.
CREATE OR REPLACE FUNCTION public.fulfill_credit_purchase(
  p_clerk_id TEXT,
  p_session_id TEXT,
  p_credits INTEGER,
  p_amount_cents INTEGER,
  p_tier TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_inserted_id UUID;
BEGIN
  IF p_credits <= 0 OR p_amount_cents <= 0 OR p_session_id = '' OR p_clerk_id = '' OR p_tier NOT IN ('free', 'pro', 'creator') THEN
    RAISE EXCEPTION 'Invalid paid credit purchase';
  END IF;

  SELECT id INTO v_user_id
  FROM public.users
  WHERE clerk_id = p_clerk_id
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Paid credit purchase account not found';
  END IF;

  INSERT INTO public.payments (
    user_id,
    stripe_session_id,
    amount_cents,
    currency,
    status,
    metadata
  ) VALUES (
    v_user_id,
    p_session_id,
    p_amount_cents,
    'usd',
    'completed',
    jsonb_build_object('credits', p_credits)
  )
  ON CONFLICT (stripe_session_id) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.users
  SET credits_remaining = COALESCE(credits_remaining, 0) + p_credits,
      tier = CASE
        WHEN p_tier = 'creator' THEN 'creator'
        WHEN p_tier = 'pro' AND COALESCE(tier, 'free') <> 'creator' THEN 'pro'
        ELSE COALESCE(tier, 'free')
      END,
      updated_at = NOW()
  WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_credit_purchase(TEXT, TEXT, INTEGER, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_credit_purchase(TEXT, TEXT, INTEGER, INTEGER, TEXT) TO service_role;
