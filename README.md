# ExpressiveAI.online

Production-ready checklist and launch notes for the ExpressiveAI video generation platform.

## Local startup

1. Install dependencies:
   pnpm install
2. Copy the example env files and fill in real values:
   - .env.example
   - apps/api/.env.example
   - apps/web/.env.example
   - apps/worker/.env.example
3. Start the app:
   pnpm dev

## Production launch checklist

### Environment and secrets

Required production values include:
- NEXT_PUBLIC_APP_URL
- NEXT_PUBLIC_API_URL
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- CLERK_WEBHOOK_SECRET
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- REDIS_URL
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- HF_TOKEN
- STORAGE_BUCKET
- STORAGE_CDN_URL
- FRONTEND_URL

The app will now fail fast in production if required values are missing. This prevents silent localhost fallbacks and half-configured deployments.

### Database and storage

- Create a live Supabase project
- Run the schema in packages/database/src/schema.sql
- Create the storage bucket used by STORAGE_BUCKET
- Ensure the public URL and policies allow generated videos to load in the web app
- Add the required tables for users, videos, notifications, payments, and moderation

### Worker and queue

- Run the Redis-backed video worker in production
- Ensure the worker remains online after deploys
- Monitor BullMQ retries and failed jobs
- Verify the worker can write to both Supabase and storage

### Payments and auth

- Configure Stripe live keys and webhook endpoint
- Set Clerk live auth keys and webhook URL
- Verify sign-in and sign-up paths resolve to your real production domain

### Deployment verification

Before going live, confirm:
- the frontend loads without localhost URLs
- the API can authenticate to Supabase
- the worker can reach Redis and the HF API
- generation requests queue successfully
- the worker writes the completed video URL back to the database
- the gallery and dashboard fetch the correct live data

## Files to review before launch

- apps/api/src/index.ts
- apps/api/src/routes/generate.ts
- apps/worker/src/index.ts
- apps/web/src/lib/api.ts
- apps/web/src/app/page.tsx
- packages/database/src/schema.sql
- scripts/deploy.mjs

## Current status

The app is buildable and the generator flow is architecturally in place, but production launch still depends on live external services and protected credentials. The app is no longer allowed to silently fall back to localhost in production mode.
