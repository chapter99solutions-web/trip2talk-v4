# Trip2Talk V4 — Vercel deploy (TASK 7)

## Prerequisites

- Logged in: `npx vercel@latest login`
- Supabase env in `.env` (local only; never commit)

## Fresh link (new machine or wrong project)

```powershell
cd "f:\Chapter 99 works\web_Pwa\cursor\Trip2Talk"
Remove-Item -Recurse -Force .vercel -ErrorAction SilentlyContinue
npx vercel@latest link --yes --project trip2talk-v4
```

## Environment variables (production)

Already set on **saenmans-projects/trip2talk-v4**. To update:

```powershell
npx vercel@latest env add VITE_SUPABASE_URL production --value "https://YOUR_REF.supabase.co" --yes --force
npx vercel@latest env add VITE_SUPABASE_ANON_KEY production --value "your_anon_key" --yes --force
```

List: `npx vercel@latest env list production`

## Production deploy

```powershell
npx vercel@latest --prod --yes
```

Or: `npm run vercel:prod` (if added to package.json).

## Custom domain

Domain **trip2talk.com.au** is configured in Vercel (production alias: `www.trip2talk.com.au`).

Add or change in dashboard: **Project → Settings → Domains**, or:

```powershell
npx vercel@latest domains add trip2talk.com.au
npx vercel@latest domains add www.trip2talk.com.au
```

DNS (at registrar): point apex/`www` per Vercel’s instructions (usually `A` / `CNAME` to Vercel).

## Project URLs

| | URL |
|---|-----|
| Production (custom) | https://www.trip2talk.com.au |
| Vercel default | https://trip2talk-v4.vercel.app (team slug may vary) |
| Dashboard | https://vercel.com/saenmans-projects/trip2talk-v4 |
