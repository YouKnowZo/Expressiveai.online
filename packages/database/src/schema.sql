-- ============================================
-- ExpressiveAI.online - Complete Database Schema
-- Run this entire script in Supabase SQL editor
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- USERS & AUTH
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    username TEXT UNIQUE,
    avatar_url TEXT,
    tier TEXT DEFAULT 'free',
    tier_expires_at TIMESTAMP,
    credits_remaining INT DEFAULT 5,
    total_videos INT DEFAULT 0,
    total_generation_time INT DEFAULT 0,
    -- Referral system
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES users(id),
    referral_count INT DEFAULT 0,
    referral_credits_earned INT DEFAULT 0,
    -- Team/Organization
    team_id UUID,
    team_role TEXT DEFAULT 'member',
    -- Settings
    email_notifications BOOLEAN DEFAULT true,
    public_profile BOOLEAN DEFAULT false,
    -- Legal & Compliance
    agreed_to_terms TIMESTAMP,
    verified_age BOOLEAN DEFAULT false,
    is_banned BOOLEAN DEFAULT false,
    ban_reason TEXT,
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_active_at TIMESTAMP
);

-- ============================================
-- TEAMS / ORGANIZATIONS
-- ============================================
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES users(id),
    logo_url TEXT,
    plan TEXT DEFAULT 'free',
    member_limit INT DEFAULT 5,
    credits_pool INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE team_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    invited_by UUID REFERENCES users(id),
    token TEXT UNIQUE,
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- VIDEOS
-- ============================================
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id),
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    seed INT,
    model_used TEXT DEFAULT 'stable-video-diffusion',
    length_seconds INT DEFAULT 5,
    video_url TEXT,
    thumbnail_url TEXT,
    watermark_version TEXT DEFAULT 'v2',
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    cost_credits INT DEFAULT 1,
    is_public BOOLEAN DEFAULT false,
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    share_count INT DEFAULT 0,
    moderation_status TEXT DEFAULT 'pending',
    moderation_flags JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ============================================
-- REFERRAL SYSTEM
-- ============================================
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES users(id),
    referred_id UUID REFERENCES users(id),
    status TEXT DEFAULT 'pending',
    credits_awarded INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE TABLE referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES users(id),
    reward_type TEXT,
    reward_value INT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ANALYTICS & TRACKING
-- ============================================
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    event_type TEXT NOT NULL,
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL,
    total_users INT DEFAULT 0,
    active_users INT DEFAULT 0,
    total_videos INT DEFAULT 0,
    total_generation_time INT DEFAULT 0,
    total_revenue_cents INT DEFAULT 0,
    new_users INT DEFAULT 0,
    churned_users INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PAYMENTS & SUBSCRIPTIONS
-- ============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    stripe_session_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    amount_cents INT,
    currency TEXT DEFAULT 'usd',
    tier TEXT,
    interval TEXT,
    status TEXT DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    credits INT NOT NULL,
    price_cents INT NOT NULL,
    popular BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true
);

-- ============================================
-- API KEYS (for developers)
-- ============================================
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    team_id UUID REFERENCES teams(id),
    name TEXT NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    key_preview TEXT,
    permissions JSONB DEFAULT '{"generate": true, "read": true}'::jsonb,
    rate_limit_per_minute INT DEFAULT 60,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

-- ============================================
-- MODERATION & REPORTS
-- ============================================
CREATE TABLE moderation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id),
    user_id UUID REFERENCES users(id),
    prompt TEXT,
    auto_score FLOAT,
    auto_flags JSONB,
    human_reviewer_id UUID REFERENCES users(id),
    human_decision TEXT,
    human_note TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

CREATE TABLE user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id),
    reporter_id UUID REFERENCES users(id),
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES & RLS
-- ============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_team_id ON users(team_id);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_status ON videos(status);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = clerk_id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = clerk_id);
CREATE POLICY "Users can view own videos" ON videos FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
CREATE POLICY "Users can insert own videos" ON videos FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
CREATE POLICY "Anyone can view public videos" ON videos FOR SELECT USING (is_public = true AND status = 'completed');

-- ============================================
-- END OF SCHEMA
-- ============================================
