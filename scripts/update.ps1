# Pull latest for all cloned projects
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "=== Updating cloned projects ===" -ForegroundColor Green

Get-ChildItem -Path "projects" -Directory | ForEach-Object {
    $dir = $_.FullName
    if (Test-Path (Join-Path $dir ".git")) {
        Write-Host "Updating $($_.Name)..." -ForegroundColor Yellow
        Push-Location $dir
        git pull --ff-only 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Diverged or error — merge manually" -ForegroundColor Yellow
        } else {
            Write-Host "  OK" -ForegroundColor Green
        }
        Pop-Location
    }
}

Write-Host "Done." -ForegroundColor Green
