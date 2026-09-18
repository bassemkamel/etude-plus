# Windows: pnpm n'est pas toujours dans le PATH (corepack EPERM).
# Usage:  .\scripts\setup.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host "Created .env from .env.example"
}

Write-Host "Starting Docker..."
docker compose up -d
docker compose ps

Write-Host "Installing dependencies..."
npx --yes pnpm@10.32.1 install

Write-Host "Prisma generate + push + seed..."
npx --yes pnpm@10.32.1 exec prisma generate
npx --yes pnpm@10.32.1 exec prisma db push
npx --yes pnpm@10.32.1 exec tsx prisma/seed.ts

Write-Host ""
Write-Host "OK. Next:"
Write-Host "  npx pnpm@10.32.1 dev:api"
Write-Host "  npx pnpm@10.32.1 dev:web"
Write-Host "Adminer  http://localhost:8080  (server=localhost user=etude password=etude db=etudeplus)"
Write-Host "Mailpit  http://localhost:8025"
Write-Host "MinIO    http://localhost:9001  (etude / etudeplus_minio)"
