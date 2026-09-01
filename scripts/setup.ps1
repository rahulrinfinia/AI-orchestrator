# Clone all projects listed in repos.yaml into projects/
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "=== AI Orchestrator Workspace Setup ===" -ForegroundColor Green

if (-not (Get-Command yq -ErrorAction SilentlyContinue)) {
    Write-Host "Warning: yq not found. Install yq or add projects manually under projects/" -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path "projects" | Out-Null
    exit 0
}

New-Item -ItemType Directory -Force -Path "projects" | Out-Null

$entries = yq e '.projects[] | @json' repos.yaml 2>$null
if (-not $entries) {
    Write-Host "No projects in repos.yaml yet. Add one, then re-run setup." -ForegroundColor Yellow
    exit 0
}

foreach ($row in $entries) {
    $j = $row | ConvertFrom-Json
    $name = $j.name
    $repo = $j.repo
    $branch = $j.branch
    $target = Join-Path "projects" $name

    if (Test-Path (Join-Path $target ".git")) {
        Write-Host "  OK $target (exists)" -ForegroundColor Green
        continue
    }

    Write-Host "  Cloning $target..." -ForegroundColor Yellow
    git clone --branch $branch $repo $target
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK $target" -ForegroundColor Green
    } else {
        Write-Host "  FAILED $target" -ForegroundColor Red
    }
}

Write-Host "`nSetup complete. Open this folder in Cursor and read AGENTS.md" -ForegroundColor Green
