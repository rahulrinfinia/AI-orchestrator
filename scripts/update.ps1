$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ProjectsDir = Join-Path $Root "projects"

Write-Host "=== Updating cloned projects ===" -ForegroundColor Green

Get-ChildItem -Path $ProjectsDir -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    $git = Join-Path $_.FullName ".git"
    if (-not (Test-Path $git)) { return }
    Write-Host "  -> $($_.Name)..." -ForegroundColor Yellow
    Push-Location $_.FullName
    if (git status --porcelain) {
        Write-Host "    Stashing local changes" -ForegroundColor Yellow
        git stash push -m "workspace-update"
    }
    git pull --ff-only
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK  $($_.Name)" -ForegroundColor Green
    } else {
        Write-Host "  WARN $($_.Name) — manual merge may be needed" -ForegroundColor Yellow
    }
    Pop-Location
}

Write-Host "`n=== Update complete ===" -ForegroundColor Green
