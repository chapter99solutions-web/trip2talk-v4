# Trip2Talk V4 — Supabase setup (TASK 5)

## 1. Create project (dashboard)

1. Open [Supabase Dashboard](https://supabase.com/dashboard).
2. **New project**
   - **Org:** `chapter99solutions-web`
   - **Name:** `trip2talk-v4`
   - **Region:** `ap-southeast-2` (Sydney)
3. Copy from **Project Settings → General**:
   - **Project ref** (e.g. `abcdefghijklmnop`)
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

> If you already have a `trip2talk-v4` project in another region, either use that ref or create a fresh project in Sydney and use its ref everywhere below.

## 2. Link CLI

```powershell
cd "f:\Chapter 99 works\web_Pwa\cursor\Trip2Talk"
npx supabase login
npx supabase link --project-ref YOUR_NEW_REF
```

When prompted, use the **database password** from project creation (Settings → Database).

After link, most commands can omit `--project-ref` and use `--linked` instead.

## 3. Run schemas (order matters)

CLI v2.101+ uses **`db query`**, not `db execute`:

```powershell
$REF = "YOUR_NEW_REF"

npx supabase db query --file supabase/00-schema-auth.sql       --project-ref $REF
npx supabase db query --file supabase/01-schema-tours-staff.sql --project-ref $REF
npx supabase db query --file supabase/02-schema-crm-safety.sql  --project-ref $REF
npx supabase db query --file supabase/03-schema-saas-mrr.sql    --project-ref $REF
```

**Linked project shortcut:**

```powershell
npx supabase db query --linked -f supabase/00-schema-auth.sql
npx supabase db query --linked -f supabase/01-schema-tours-staff.sql
npx supabase db query --linked -f supabase/02-schema-crm-safety.sql
npx supabase db query --linked -f supabase/03-schema-saas-mrr.sql
```

**Fallback:** Dashboard → **SQL Editor** → paste each file in the same order.

### Seed PINs (from `00-schema-auth.sql`)

| PIN  | Role            |
|------|-----------------|
| 1111 | STAFF           |
| 4444 | COHOST          |
| 9999 | OWNER           |
| 3501 | PLATFORM_ADMIN  |

## 4. Deploy Edge Functions

```powershell
$REF = "YOUR_NEW_REF"

npx supabase functions deploy google-workspace-sync --project-ref $REF
npx supabase functions deploy send-trip-receipt       --project-ref $REF
npx supabase functions deploy record-waiver           --project-ref $REF
```

`record-waiver` is required for client waiver signing (`signed_at`, `ip_address`, `content_hash`).

JWT verification is off for these functions in `config.toml` (public PWA callers). Lock down with RLS + app checks in production if needed.

## 5. Secrets

Set on the **linked** project (replace placeholders; never commit real values):

```powershell
$REF = "YOUR_NEW_REF"

npx supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' --project-ref $REF
npx supabase secrets set GOOGLE_SPREADSHEET_ID='your_sheet_id' --project-ref $REF
npx supabase secrets set RESEND_API_KEY='re_XXXX' --project-ref $REF
npx supabase secrets set TWILIO_ACCOUNT_SID='AC_XXXX' --project-ref $REF
npx supabase secrets set TWILIO_AUTH_TOKEN='...' --project-ref $REF
npx supabase secrets set TWILIO_FROM_NUMBER='+61XXXXXXXXX' --project-ref $REF
```

> **Note:** Code reads `TWILIO_FROM_NUMBER`, not `TWILIO_PHONE_NUMBER`. See `supabase/functions/.env.example`.

`record-waiver` uses built-in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (injected by Supabase at runtime).

## 6. Frontend env

Root `.env` / `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_NEW_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your_anon_key...
```

Restart `npm run dev` after changing env.

## One-shot script (Windows)

```powershell
$env:SUPABASE_PROJECT_REF = "YOUR_NEW_REF"
.\scripts\supabase-bootstrap.ps1
```

Optional flags: `-SkipSchemas`, `-SkipFunctions`, `-SkipSecrets` (secrets step prints commands only).

## Verify

```powershell
npx supabase projects list
npx supabase functions list --project-ref YOUR_NEW_REF
```

In SQL Editor: `SELECT slug, name FROM tenants;` and `SELECT role, pin_code, display_name FROM pin_users WHERE is_active;`
