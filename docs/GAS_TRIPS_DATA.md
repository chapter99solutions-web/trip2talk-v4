# Trip info — Google Apps Script setup

The public homepage loads trips via `VITE_GAS_WEBAPP_URL` → `?action=getTrips` (or `?action=listTrips`).

**Web app URL (repo default):**

`https://script.google.com/macros/s/AKfycbwR0VylDEfZZUdk49p_6TQeHggQp0U7gNRexJGpFkMvxCNM3KRrw-gXz2FRWVXhA6CVvg/exec`

## Spreadsheet ID (production)

| Property | Value |
|----------|--------|
| **SPREADSHEET_ID** | `1L1VUu0qvL0-G0C1z9byscU11kKcuMCM0iajNLjxH9eE` |
| **Sheet URL** | https://docs.google.com/spreadsheets/d/1L1VUu0qvL0-G0C1z9byscU11kKcuMCM0iajNLjxH9eE/edit |

This ID is the default in [`gas/Code.gs`](../gas/Code.gs). Override via Apps Script **Project settings → Script properties** → `SPREADSHEET_ID` only if you use a copy of the sheet.

## Sheet tab (required)

- Tab name must be exactly **`Trip info`** (case-sensitive, including the space).
- **Not** `Trips_Data` — the code maps that legacy name to `Trip info` in query params only.
- Row 1 = headers; row 2+ = trip data.
- Each data row needs **`Trip Code`** (seed layout) or legacy **`Tour Code`** / `tourCode`.

## Seed the Trip info tab (20 columns, 8 trips)

If `getTrips` returns `Missing tab: "Trip info" (found: Trips_Data, …)`:

```text
GET {VITE_GAS_WEBAPP_URL}?action=seedTripInfoSheet
```

This creates or replaces the **`Trip info`** tab (does not remove `Trips_Data`). Row 1 uses the 20 Title Case headers (`Trip Code`, `Tour Name`, `Cover`, `Price`, …). Rows 2–9 are the eight real tour codes from `src/lib/realTourCodes.ts`. **Status:** `CONFIRMED` for `NZ-6D5N` and `TAS-3D2N`; `DRAFT` for the rest. **Departure Date** is left blank.

Then verify:

```text
GET {VITE_GAS_WEBAPP_URL}?action=getTrips&debug=1
```

Expect `read.tab`: `"Trip info"`, `tripCount`: `8`, `totalRowsIncludingHeader`: `9`.

Legacy master seed (old column layout): `?action=seedMasterTrips` — prefer `seedTripInfoSheet` for the v4 sheet.

## Owner: deploy Apps Script (manual — Google login required)

1. Open the spreadsheet → **Extensions → Apps Script** (container-bound), **or** script.google.com for the standalone web app project tied to this `/exec` URL.
2. Replace **Code.gs** with [`gas/Code.gs`](../gas/Code.gs) from this repo (**v3.0+**). All sheet access goes through `ss_()` (`getActiveSpreadsheet()` when bound, else `openById` for the web app).
3. Optional: **Project settings → Script properties** → `SPREADSHEET_ID` = `1L1VUu0qvL0-G0C1z9byscU11kKcuMCM0iajNLjxH9eE`.
4. **Deploy → Manage deployments → Edit (pencil) → New version → Deploy**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Set `VITE_GAS_WEBAPP_URL` / `GAS_WEBAPP_URL` to the **same** `/exec` URL you just deployed.

### How to tell the old stub is still live

| Response | Meaning |
|----------|---------|
| `{"ok":true,"data":{"status":"GAS running..."}}` | **Old health stub** — not reading Trip info. Redeploy v3.0 `Code.gs`. |
| `{"ok":true,"data":[]}` only (no `version`, no `trips`) | **Legacy stub** — ignores `?action=getTrips`. Redeploy required. |
| `{"ok":true,"version":"3.0","trips":[...],"data":[...]}` | **Correct** — reading Trip info. |
| `{"ok":true,"version":"3.0","trips":[],"data":[]}` | Deployed OK but tab empty or no Tour Code column. |

## Verify after deploy

```text
GET {VITE_GAS_WEBAPP_URL}?action=getTrips&debug=1
```

Expected shape (v3.0+):

```json
{
  "ok": true,
  "status": "ok",
  "version": "3.0",
  "trips": [ { "tourCode": "MEL-4D3N", "tourName": "...", ... } ],
  "data": [ ... ],
  "read": {
    "spreadsheetId": "1L1VUu0qvL0-G0C1z9byscU11kKcuMCM0iajNLjxH9eE",
    "tab": "Trip info",
    "sheetNames": ["Trip info", "Customer_Bookings", ...],
    "totalRowsIncludingHeader": 9,
    "tripCount": 8,
    "headers": ["Tour Code", "Tour Name", ...]
  }
}
```

View execution logs: Apps Script → **Executions** (Logger output from `readTrips_`).

## Seed all 8 master trips

**Preferred (Trip info 20-column layout):**

```text
GET {VITE_GAS_WEBAPP_URL}?action=seedTripInfoSheet
```

**Legacy (old Trips_Data-style headers via upsert):**

```text
GET {VITE_GAS_WEBAPP_URL}?action=seedMasterTrips
```

Or: `npm run seed:trips`

Master tour codes: `TAS-3D2N`, `MEL-4D3N`, `ULU-4D3N`, `NZ-6D5N`, `TAS-LH-4D3N`, `KIA-1DAY`, `CAN-2D1N`, `SYD-1DAY`.

### Trip info — Cover column (Tasmania)

After `?action=seedMasterTrips`, set **Cover** for these rows if blank:

| Tour Code | Cover URL |
|-----------|-----------|
| `TAS-3D2N` | `https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Tasmania/Launceston/596811714_1428639069261190_2753284779604496226_n.jpg` |
| `TAS-LH-4D3N` | `https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Tasmania/Launceston/596371362_1428639202594510_8709278754225773992_n.jpg` |

## Customer_Bookings (portal login)

```text
GET {VITE_GAS_WEBAPP_URL}?action=getBookings
```

Seed test bookings: `?action=seedTestBookings` or `npm run seed:booking`.
