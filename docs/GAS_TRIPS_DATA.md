# Trips_Data — Google Apps Script setup

The public homepage loads trips via `VITE_GAS_WEBAPP_URL` → `?action=getTrips`.

**Production web app (May 2026):**

`https://script.google.com/macros/s/AKfycbwCrRqndZzgqnVBi28O-nJq3MT3T8tI0ZffgqIV_eEkjSLp6wR6w_dzucwoOEpl0MYV/exec`

## Spreadsheet ID (production)

| Property | Value |
|----------|--------|
| **SPREADSHEET_ID** | `1U1APoAcFz5zwwcqql1uVHm4CCOtll7bhCLbCELUBuP4` |
| **Sheet URL** | https://docs.google.com/spreadsheets/d/1U1APoAcFz5zwwcqql1uVHm4CCOtll7bhCLbCELUBuP4/edit |

This ID is the default in [`gas/Code.gs`](../gas/Code.gs). You may override it in Apps Script **Script properties** if you clone the sheet.

## Owner: deploy Apps Script (manual — Google login required)

1. Open [Google Apps Script](https://script.google.com) for the Trip2Talk web app project (same project as your `/exec` deployment).
2. Replace **Code.gs** with the contents of [`gas/Code.gs`](../gas/Code.gs) from this repo (or merge the `SPREADSHEET_ID` constant + `spreadsheetId_()` logic).
3. Optional: **Project Settings → Script properties** → add `SPREADSHEET_ID` = `1U1APoAcFz5zwwcqql1uVHm4CCOtll7bhCLbCELUBuP4` (only needed if you change the constant in code).
4. **Deploy → Manage deployments → Edit (pencil) → New version → Deploy**  
   - Execute as: **Me**  
   - Who has access: **Anyone**
5. Confirm the `/exec` URL matches `VITE_GAS_WEBAPP_URL` in Vercel and `.env.local`.

## Sheet tab

- Tab name must be exactly **`Trips_Data`** (case-sensitive).
- Row 1 = headers; row 2+ = trip data.
- Each data row needs **`Tour Code`** or **`tourCode`**.
- Extended columns (v2.1): `Trip Type`, `Season`, `Max Pax`, `Highlights`, `Pickup Type`.

## Seed all 8 master trips

After deploying [`gas/Code.gs`](../gas/Code.gs) v2.1+:

```text
GET {VITE_GAS_WEBAPP_URL}?action=seedMasterTrips
```

Or from this repo (with `VITE_GAS_WEBAPP_URL` in `.env.local`):

```bash
npm run seed:trips
```

Master trip codes: `MEL-4D3N`, `ULU-4D3N`, `NZ-6D5N`, `TAS-3D2N`, `TAS-LH-4D3N`, `KIA-1DAY`, `CAN-2D1N`, `SYD-1DAY`.
Source of truth in app: [`src/lib/masterTrips.ts`](../src/lib/masterTrips.ts).

## Customer_Bookings (portal login)

```text
GET {VITE_GAS_WEBAPP_URL}?action=getBookings
```

Expected:

```json
{"status":"ok","bookings":[{"bookingId":"BK-001","customerName":"Saen Test","tourCode":"SYD-1DAY", ...}],"data":[...]}
```

Seed three test bookings (after deploy v2.3+):

```text
GET {VITE_GAS_WEBAPP_URL}?action=seedTestBookings
```

Or: `npm run seed:booking`

Test IDs: **BK-001** (KIA-1DAY), **BK-002** (CAN-2D1N), **BK-003** (NZ-6D5N).

Portal fallback (offline GAS): [`src/lib/mockBookings.ts`](../src/lib/mockBookings.ts).

## Verify after deploy

```text
GET {VITE_GAS_WEBAPP_URL}?action=getTrips
```

Expected:

```json
{"status":"ok","trips":[{"tourCode":"SYD-1DAY", ...}]}
```

If you still see `YOUR_SPREADSHEET_ID` in the error, the live deployment was not updated — repeat step 4 (new version).

## Vercel

`VITE_GAS_WEBAPP_URL` is baked at build time. After changing it, run a new production deploy.
