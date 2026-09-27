# Secrets management with Infisical

This repo keeps secrets in [Infisical](https://infisical.com) instead of in `.env` files on disk.
Application code is unchanged: it still reads `process.env`, and Infisical injects the values into
the process at startup with the CLI.

Legend: **wired** = already changed in this repo. **manual** = only you can do it (account, login, dashboards).

## 1. Delivery targets

This monorepo ships to four places, and each needs a different delivery method:

| Target | How it is run | Method |
| --- | --- | --- |
| Local development | `pnpm dev` (turbo → each app's `dev` script) | Infisical CLI, user login — **wired** |
| Local production-mode run | each app's `start` script | Infisical CLI, user login — **wired** |
| CI/CD | `.github/workflows/ci.yml`, `deploy.yml` | Machine identity + Universal Auth — **manual** |
| Production hosts | Vercel (`apps/web`), Render (`apps/api`, `apps/worker`) | Machine identity, or a secret sync — **manual** |

## 2. Environment variables the apps read

Names only — never commit or paste real values.

- `apps/web`: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `CLERK_SECRET_KEY`
- `apps/api`: `PORT`, `NODE_ENV`, `FRONTEND_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `REDIS_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLERK_WEBHOOK_SECRET`,
  `CLERK_ISSUER`, `CLERK_JWKS_URL`, `HF_TOKEN`, `STORAGE_BUCKET`, `STORAGE_CDN_URL`
- `apps/worker`: `NODE_ENV`, `REDIS_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HF_TOKEN`,
  `HUGGINGFACE_MODEL_ID`, `STORAGE_BUCKET`, `STORAGE_CDN_URL`

The full template lives in `.env.example`, with per-app versions in `apps/*/.env.example`.

## 3. Local development (wired)

`dev` and `start` in the three app `package.json` files now run through the CLI, so the wrapped
command is the default for the team:

| App | Script | Command |
| --- | --- | --- |
| `apps/web` | `dev` | `infisical run --env=dev -- next dev` |
| `apps/web` | `start` | `infisical run --env=prod -- next start` |
| `apps/api` | `dev` | `infisical run --env=dev -- tsx watch src/index.ts` |
| `apps/api` | `start` | `infisical run --env=prod -- node dist/index.js` |
| `apps/worker` | `dev` | `infisical run --env=dev -- tsx src/index.ts` |
| `apps/worker` | `start` | `infisical run --env=prod -- node dist/index.js` |

`pnpm dev` at the repo root starts every app and therefore every wrapped script. Secrets injected by
the CLI win over any leftover `.env` file, because `dotenv` and Next.js do not override variables
that are already in the environment.

Escape hatches while you are onboarding: `dev:local` and `start:local` in each app run the original,
unwrapped command, for example `pnpm --filter @expressiveai/web dev:local`.

Note: `build` is intentionally left unwrapped. Next.js inlines `NEXT_PUBLIC_*` values at build time,
so a local production build needs them present — use
`cd apps/web && infisical run --env=prod -- pnpm build`. On Vercel and in CI the platform supplies
those values (see below).

## 4. One-time setup (manual)

1. **Account** — sign up at <https://app.infisical.com>.
2. **Projects** — create one project per service:
   `expressiveai-web`, `expressiveai-api`, `expressiveai-worker`.
   Every new project starts with the `Development`, `Staging` and `Production` environments.
3. **Import secrets** — drag and drop each existing file onto its project's Secrets Overview page
   and pick the target environment(s) from the import dialog:
   - `apps/web/.env.local` → project `expressiveai-web`
   - `apps/api/.env` → project `expressiveai-api`
   - for `apps/worker`, whose local file does not exist yet, paste the `apps/worker/.env.example`
     keys with their real values → project `expressiveai-worker`
   - review the repo-root `.env` and `.env.local` for any key not covered above and import those too.

   Import whatever `Environment` slug matches the target: `dev`, `staging`, or `prod`.
4. **Install the CLI** — see <https://infisical.com/docs/cli/overview>, for example
   `brew install infisical/get-cli/infisical` (macOS), `winget install infisical` (Windows),
   `npm install -g @infisical/cli` (any OS with Node).
5. **Log in** — `infisical login`. In WSL 2, a Codespace, or a remote SSH session with no browser,
   use `infisical login -i` instead.
6. **Link each app** — run `infisical init` inside `apps/web`, `apps/api` and `apps/worker` and pick
   the matching project. This writes one `.infisical.json` per app. That file contains only the
   project id and is safe to commit; `.gitignore` says so too.
7. **Remove the on-disk files** — once `pnpm dev` works through Infisical, rename `apps/web/.env.local`,
   `apps/api/.env`, and the repo-root `.env` / `.env.local` to `*.backup` (matched by `.gitignore`),
   restart, and confirm the apps still boot.

## 5. CI/CD and production (manual)

Never use interactive login outside your machine.

1. Create a **machine identity** per workload — see
   <https://infisical.com/docs/documentation/platform/identities/machine-identities> — and enable
   **Universal Auth** on it: <https://infisical.com/docs/documentation/platform/identities/universal-auth>.
2. Add the identity to exactly one project and give it read access to the minimum environment it
   needs (`prod` for the API/worker, `prod` for the web build). Do not grant organization-wide roles.
3. Add a **Client Secret** to the identity, then store the Client ID and Client Secret in the
   platform's own secret store — never in a file in this repo:
   - GitHub Actions: repository secrets `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`,
     `INFISICAL_PROJECT_ID`.
   - Vercel: project environment variables, or use Infisical's Vercel secret sync —
     <https://infisical.com/docs/integrations/secret-syncs/overview>. Next.js inlines `NEXT_PUBLIC_*`
     at build time, so the values must be present during the Vercel build, and Vercel never calls
     `next start`, so the wrapped `start` script does not apply there.
   - Render (api + worker): set `INFISICAL_UNIVERSAL_AUTH_CLIENT_ID` and
     `INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET` as service environment variables and install the CLI
     in the build command, e.g. `npm install -g @infisical/cli@<pinned-version> && pnpm install --frozen-lockfile && pnpm build`.
     Because machine identity logins print an access token instead of saving a profile, bootstrap the
     start command:

     ```bash
     INFISICAL_TOKEN=$(infisical login --method=universal-auth --silent --plain) \
       infisical run --env=prod -- node dist/index.js
     ```

     Or run the already-wrapped script (`pnpm --filter @expressiveai/api start`) with that
     `INFISICAL_TOKEN` exported. The committed `.infisical.json` supplies the project id, so
     `--projectId` is only needed if the working directory is not the app directory.
4. GitHub Actions can pull straight from Infisical with the official action instead of repository
   secrets — see <https://infisical.com/docs/integrations/cicd/githubactions>:

   ```yaml
   - uses: infisical/secrets-action@v1
     with:
       method: universal-auth
       client-id: ${{ secrets.INFISICAL_CLIENT_ID }}
       client-secret: ${{ secrets.INFISICAL_CLIENT_SECRET }}
       project-slug: expressiveai-web
       env-slug: prod
   ```

   The workflow files in this repo have **not** been switched over, because doing so fails the
   pipeline until the identity above exists. `.github/workflows/deploy.yml` still reads
   `NEXT_PUBLIC_*` from repository secrets.

## 6. Verify it works

Use lengths, never values, and run these from the app directory that has a linked `.infisical.json`:

```bash
cd apps/api
infisical run --env=dev -- node -e "console.log('SUPABASE_URL chars:', (process.env.SUPABASE_URL || '').length)"
infisical run --env=dev -- node -e "console.log('REDIS_URL chars:', (process.env.REDIS_URL || '').length)"
```

Each should print a non-zero length. Then prove the value is not coming from disk:

```bash
mv .env .env.backup     # or .env.local for apps/web
pnpm dev                # the app must still start and serve traffic
```

If it boots with no `.env` present, the secrets are coming from Infisical.

## 7. Cleanup and leaked-secret checks

- `.gitignore` covers `.env`, `.env.local`, `.env.*.local` and now `.env*.backup`, so renamed local
  files stay out of git. It also notes that `.infisical.json` is safe to commit.
- This repository's history was checked with `git log --all --name-only`: the only `.env*` paths ever
  committed are the `*.env.example` templates, so no real values were stored in git history here.
- Scan for anything that slipped elsewhere in the codebase or your machine:

  ```bash
  infisical scan git .          # whole history
  infisical scan --help         # other scan types
  ```

  See <https://infisical.com/docs/cli/scanning-overview>.
- If a real secret was ever committed, pasted into a ticket, or shared in a channel, **rotate it at
  the provider** (Supabase, Clerk, Stripe, Redis, Hugging Face, SMTP). Deleting the file or the
  commit does not invalidate the credential, because git history keeps it.
