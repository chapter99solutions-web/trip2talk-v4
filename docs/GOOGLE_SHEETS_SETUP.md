# Google Sheets Setup for Trip2Talk V4

## Step 1: Create Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a new spreadsheet named **Trip2Talk ATO Expenses 2025-2026**
3. Create 2 sheets (tabs):
   - `Tax_Year_2025_2026` (expenses)
   - `Tax_Year_2025_2026_Settlements` (tour settlements)
4. Add headers to **Tax_Year_2025_2026** row 1:

   | Synced At | Receipt ID | Tour ID | Vendor | Category | Amount AUD | Has GST | GST Amount | Net Amount | Filename | Created At |

5. Add headers to **Tax_Year_2025_2026_Settlements** row 1:

   | Synced At | Tour Code | Revenue | Expenses | Commissions | Net Profit | GST Collected | GST Claimed | Synced At |

6. Copy the Spreadsheet ID from the URL:

   `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`

7. Save `SPREADSHEET_ID` for Supabase secrets

## Step 2: Create Service Account

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project **Trip2Talk**
3. Enable **Google Sheets API** and **Google Drive API**
4. **IAM & Admin** → **Service Accounts** → **Create Service Account**
   - Name: `trip2talk-sheets`
5. **Keys** → **Add Key** → **JSON** → Download
6. Share your Google Sheet with the service account email (Editor access)
7. Copy the entire JSON file content for the `GOOGLE_SERVICE_ACCOUNT_JSON` secret

## Step 3: Add Supabase Secrets

In **Supabase Dashboard** → **Edge Functions** → **Secrets**:

| Secret | Value |
|--------|--------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Paste entire service account JSON |
| `GOOGLE_SPREADSHEET_ID` | Your spreadsheet ID from Step 1 |

## Step 4: Deploy Edge Function

```bash
npx supabase login
npx supabase functions deploy google-workspace-sync --project-ref rvcwprxnqwscgjusmjvj
```

## Step 5: Sync from Owner Dashboard

1. Log in as Owner (PIN `9999`)
2. Open **OWNER HQ**
3. Click **SYNC TO GOOGLE SHEETS** below the expense log
4. Unsynced expenses and completed tour settlements append to the sheet
