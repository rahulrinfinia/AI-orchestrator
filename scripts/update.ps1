# Update all cloned project repos

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "=== Updating All Projects ===" -ForegroundColor Green

Get-ChildItem (Join-Path $Root "projects") -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    $dir = $_.FullName
    if (-not (Test-Path (Join-Path $dir ".git"))) { return }

    Write-Host "  ->  Updating $($_.Name)..." -ForegroundColor Yellow
    Push-Location $dir
    if (git status --porcelain) {
        Write-Host "    ! Stashing local changes" -ForegroundColor Yellow
        git stash push -m "workspace-update-$(Get-Date -Format yyyyMMdd)"
    }
    git pull --ff-only
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK  projects/$($_.Name)" -ForegroundColor Green
    } else {
        Write-Host "  !   projects/$($_.Name) diverged — manual merge needed" -ForegroundColor Yellow
    }
    Pop-Location
}

Write-Host "`n=== Update complete ===" -ForegroundColor Green
