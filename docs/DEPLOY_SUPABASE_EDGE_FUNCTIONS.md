# Supabase Edge Functions Deployment

This project uses two Supabase Edge Functions:

- `wechat-login`
- `app-api`

The functions depend on:

- `SERVICE_ROLE_KEY`
- `WECHAT_APP_ID`
- `WECHAT_APP_SECRET`

## 1. Prepare Supabase

In the Supabase dashboard:

1. Open `SQL Editor`.
2. Run `supabase/migrations/003_secure_user_isolation.sql`.
3. Confirm these tables exist:
   - `public.app_users`
   - `public.app_sessions`
   - `public.tasks`
   - `public.lists`
4. Confirm the old open `anon` CRUD policies for `tasks` and `lists` are removed.

In `Project Settings -> API`, collect:

- `Project URL`
- `anon public key`
- `service_role secret key`

In `Edge Functions -> Secrets`, configure:

- `SERVICE_ROLE_KEY=<service_role secret key>`
- `WECHAT_APP_ID=<your WeChat Mini Program AppID>`
- `WECHAT_APP_SECRET=<your WeChat Mini Program AppSecret>`

Update local `.env`:

```env
TARO_APP_SUPABASE_URL=<Project URL>
TARO_APP_SUPABASE_ANON_KEY=<anon public key>
```

## 2. Install Supabase CLI

If `supabase --version` does not work, install the CLI first. In this project, prefer running the CLI through `npm exec` so it works even when `supabase` is not in PATH.

Typical options:

```powershell
npm exec --yes supabase -- --version
```

or install it globally following the official Supabase CLI instructions.

Then authenticate:

```powershell
npm exec --yes supabase -- login
```

## 3. Link and Deploy

The current project ref is expected to be:

```text
mzqbykasnnzahbcyywtl
```

From the repository root:

```powershell
npm exec --yes supabase -- secrets set SERVICE_ROLE_KEY="<service role key>" WECHAT_APP_ID="<wechat app id>" WECHAT_APP_SECRET="<wechat app secret>" --project-ref mzqbykasnnzahbcyywtl
npm exec --yes supabase -- link --project-ref mzqbykasnnzahbcyywtl
npm exec --yes supabase -- functions deploy wechat-login
npm exec --yes supabase -- functions deploy app-api
```

You can also use the helper script:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-supabase-functions.ps1
```

## 4. Verify

After deployment, check in the Supabase dashboard:

- `wechat-login` exists under `Edge Functions`
- `app-api` exists under `Edge Functions`
- both show the latest deployment timestamp

Then test the app:

1. Log in from the Mini Program and confirm `wechat-login` returns `sessionToken`, `sessionExpiresAt`, and a stable `user.id`.
2. Confirm `app_users` and `login_logs` update as expected.
3. Confirm `app-api` returns `listTasks` and `listLists` after login.
4. Confirm two different WeChat accounts cannot see or mutate each other's data.

## 5. Failure Checks

If deployment succeeds but runtime fails, inspect these first:

- missing `SUPABASE_SERVICE_ROLE_KEY`
- missing `SERVICE_ROLE_KEY`
- missing `WECHAT_APP_ID` or `WECHAT_APP_SECRET`
- migration `003_secure_user_isolation.sql` was not applied
- `supabase link` points to the wrong project
