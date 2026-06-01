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
- Each data row needs **`Tour Code`** (or `tourCode`).

## Owner: deploy Apps Script (manual — Google login required)

1. Open the spreadsheet → **Extensions → Apps Script** (container-bound), **or** script.google.com for the standalone web app project tied to this `/exec` URL.
2. Replace **Code.gs** with [`gas/Code.gs`](../gas/Code.gs) from this repo (**v2.9+**).
3. Optional: **Project settings → Script properties** → `SPREADSHEET_ID` = `1L1VUu0qvL0-G0C1z9byscU11kKcuMCM0iajNLjxH9eE`.
4. **Deploy → Manage deployments → Edit (pencil) → New version → Deploy**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Set `VITE_GAS_WEBAPP_URL` / `GAS_WEBAPP_URL` to the **same** `/exec` URL you just deployed.

### How to tell the old stub is still live

| Response | Meaning |
|----------|---------|
| `{"ok":true,"data":[]}` only | **Old stub** — ignores `?action=getTrips`. Redeploy required. |
| `{"ok":true,"version":"2.9","trips":[...],"data":[...]}` | **Correct** — reading Trip info. |
| `{"ok":true,"version":"2.9","trips":[],"data":[]}` | Deployed OK but tab empty or no Tour Code column. |

## Verify after deploy

```text
GET {VITE_GAS_WEBAPP_URL}?action=getTrips&debug=1
```

Expected shape (v2.9+):

```json
{
  "ok": true,
  "status": "ok",
  "version": "2.9",
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

```text
GET {VITE_GAS_WEBAPP_URL}?action=seedMasterTrips
```

Or: `npm run seed:trips`

Master tour codes: `MEL-4D3N`, `ULU-4D3N`, `NZ-6D5N`, `TAS-3D2N`, `TAS-LH-4D3N`, `KIA-1DAY`, `CAN-2D1N`, `SYD-1DAY`.

## Customer_Bookings (portal login)

```text
GET {VITE_GAS_WEBAPP_URL}?action=getBookings
```

Seed test bookings: `?action=seedTestBookings` or `npm run seed:booking`.
