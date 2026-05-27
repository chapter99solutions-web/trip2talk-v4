# Trip2Talk V4 — Supabase bootstrap (schemas + functions)
# Usage:
#   $env:SUPABASE_PROJECT_REF = "your_project_ref"
#   .\scripts\supabase-bootstrap.ps1
# Optional: -DatabasePassword "..." for link (if not already linked)

param(
  [string]$ProjectRef = $env:SUPABASE_PROJECT_REF,
  [string]$DatabasePassword = $env:SUPABASE_DB_PASSWORD,
  [switch]$SkipLink,
  [switch]$SkipSchemas,
  [switch]$SkipFunctions,
  [switch]$SkipSecrets
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not $ProjectRef) {
  Write-Error "Set SUPABASE_PROJECT_REF or pass -ProjectRef. Example: rvcwprxnqwscgjusmjvj"
}

$linkedFlag = @("--project-ref", $ProjectRef)
$queryLinked = @("db", "query", "--project-ref", $ProjectRef, "-f")
$deploy = { param($name) npx supabase functions deploy $name @linkedFlag }

Write-Host "Trip2Talk V4 Supabase bootstrap — ref: $ProjectRef" -ForegroundColor Cyan

if (-not $SkipLink) {
  Write-Host "`n[1/4] Link project (skip with -SkipLink if already linked)..." -ForegroundColor Yellow
  $linkArgs = @("link", "--project-ref", $ProjectRef)
  if ($DatabasePassword) { $linkArgs += @("-p", $DatabasePassword) }
  npx supabase @linkArgs
}

if (-not $SkipSchemas) {
  Write-Host "`n[2/4] Applying SQL schemas in order..." -ForegroundColor Yellow
  $schemaFiles = @(
    "supabase/00-schema-auth.sql",
    "supabase/01-schema-tours-staff.sql",
    "supabase/02-schema-crm-safety.sql",
    "supabase/03-schema-saas-mrr.sql"
  )
  foreach ($file in $schemaFiles) {
    Write-Host "  -> $file"
    npx supabase @queryLinked $file
  }
}

if (-not $SkipFunctions) {
  Write-Host "`n[3/4] Deploying Edge Functions..." -ForegroundColor Yellow
  & $deploy "google-workspace-sync"
  & $deploy "send-trip-receipt"
  & $deploy "record-waiver"
}

if (-not $SkipSecrets) {
  Write-Host "`n[4/4] Secrets (set manually — not run by this script):" -ForegroundColor Yellow
  @(
    "npx supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='...' --project-ref $ProjectRef",
    "npx supabase secrets set GOOGLE_SPREADSHEET_ID='...' --project-ref $ProjectRef",
    "npx supabase secrets set RESEND_API_KEY='re_XXXX' --project-ref $ProjectRef",
    "npx supabase secrets set TWILIO_ACCOUNT_SID='AC_XXXX' --project-ref $ProjectRef",
    "npx supabase secrets set TWILIO_AUTH_TOKEN='...' --project-ref $ProjectRef",
    "npx supabase secrets set TWILIO_FROM_NUMBER='+61XXXXXXXXX' --project-ref $ProjectRef"
  ) | ForEach-Object { Write-Host "  $_" }
}

Write-Host "`nDone. Update .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY." -ForegroundColor Green
