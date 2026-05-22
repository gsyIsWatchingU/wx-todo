param(
  [string]$ProjectRef = "mzqbykasnnzahbcyywtl",
  [string]$MigrationFile = "supabase/migrations/003_secure_user_isolation.sql",
  [switch]$SkipMigration
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$CommandName)

  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $CommandName"
  }
}

Require-Command "npm"

if (-not $SkipMigration) {
  if (-not (Test-Path $MigrationFile)) {
    throw "Migration file not found: $MigrationFile"
  }

  Write-Host ""
  Write-Host "Step 1: Run this migration in Supabase SQL Editor before deploying functions:" -ForegroundColor Cyan
  Write-Host "  $MigrationFile" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 2: Make sure these function secrets already exist in Supabase:" -ForegroundColor Cyan
Write-Host "  SERVICE_ROLE_KEY" -ForegroundColor Yellow
Write-Host "  WECHAT_APP_ID" -ForegroundColor Yellow
Write-Host "  WECHAT_APP_SECRET" -ForegroundColor Yellow

Write-Host ""
Write-Host "Step 3: Linking project $ProjectRef ..." -ForegroundColor Cyan
npm exec --yes supabase -- link --project-ref $ProjectRef

Write-Host ""
Write-Host "Step 4: Deploying wechat-login ..." -ForegroundColor Cyan
npm exec --yes supabase -- functions deploy wechat-login

Write-Host ""
Write-Host "Step 5: Deploying app-api ..." -ForegroundColor Cyan
npm exec --yes supabase -- functions deploy app-api

Write-Host ""
Write-Host "Done. Verify both functions in the Supabase dashboard." -ForegroundColor Green
