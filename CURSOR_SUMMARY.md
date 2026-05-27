# Trip2Talk V4 — Cursor agent summary

Chapter 99 Photography · Private Photo Journey PWA (React + TypeScript + Vite + Supabase).

## Vocabulary (UI copy)

- Use **ทริป** in Thai user-facing text — not **ทัวร์**.
- English UI: prefer **trip** over **tour** for customers (e.g. “Book this trip”).
- **Do not rename:** DB tables `tours`, `tour_bookings`; columns `tour_id`, `tour_date`; URL routes `/tours/:tourId` (SEO).

## BUSINESS RULE — Minimum Pax

| Tier | Label | Guests | Pricing |
|------|--------|--------|---------|
| **Tier 1 Standard** | Standard list | **4–6** | Standard rate per person |
| **Tier 2 Private** | Guaranteed Departure | **1–3** | Private premium (`PRIVATE_PRICE_MULTIPLIER` in `src/lib/bookingPolicy.ts`) |

- **Solo traveller (1 คน) = Tier 2 Private rate** (same premium tier as 2–3).
- **Reason:** Most clients are solo female travellers booking alone.
- Source of truth: `TRIP_SIZE_TIERS` + `resolveTripSizeTier()` in `src/lib/bookingPolicy.ts`.

## Other product rules

- Service positioning: **Private Photo Journey** — not a commercial mass-market tour operator (บริการนำเที่ยวทั่วไป).
- Album delivery: **.JPG only**; signed/private link **60 days** (then expires). DB: `expires_at = now() + interval '60 days'` via `mark_album_delivered()` — **not 90 days**.
- Owner cancellation &lt;45 days before departure → **100% refund** (see `bookingPolicy.ts`).

## Key paths

| Area | Path |
|------|------|
| Public booking | `src/pages/BookingCheckout.tsx` |
| Package terms | `src/pages/TravelPackageTerms.tsx` |
| Photo terms | `src/pages/PhotoDeliveryTerms.tsx` |
| Client waivers | `src/components/client/ClientTripWizard.tsx` |
| Tier / quote logic | `src/lib/bookingPolicy.ts` |
| Customer lifecycle | `src/lib/customerJourney.ts` |
| Supabase schemas | `supabase/00`–`05` |

## Supabase

- Project runbook: `supabase/README.md`
- Edge functions: `record-waiver`, `send-trip-receipt`, `deliver-album`, `send-retarget-sms`, `google-workspace-sync`
