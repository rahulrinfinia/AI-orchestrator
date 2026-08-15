param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ReposFile = Join-Path $Root "repos.yaml"

Write-Host "=== AI Orchestrator Workspace Setup ===" -ForegroundColor Green

if (-not (Test-Path $ReposFile)) {
    Write-Error "repos.yaml not found at $ReposFile"
}

$ProjectsDir = Join-Path $Root "projects"
New-Item -ItemType Directory -Force -Path $ProjectsDir | Out-Null

# Minimal YAML parse for projects list (name, repo, branch)
$content = Get-Content $ReposFile -Raw
$lines = Get-Content $ReposFile
$projects = @()
$current = $null

foreach ($line in $lines) {
    if ($line -match '^\s*-\s*name:\s*(.+)$') {
        if ($current) { $projects += $current }
        $current = @{ name = $Matches[1].Trim(); repo = ""; branch = "main" }
    }
    elseif ($current -and $line -match '^\s*repo:\s*(.+)$') {
        $current.repo = $Matches[1].Trim()
    }
    elseif ($current -and $line -match '^\s*branch:\s*(.+)$') {
        $current.branch = $Matches[1].Trim()
    }
}

if ($current) { $projects += $current }
$projects = $projects | Where-Object { $_.name -and $_.repo -and $_.repo -notmatch '^#' }

if ($projects.Count -eq 0) {
    Write-Host "No projects configured in repos.yaml (add entries under projects:)." -ForegroundColor Yellow
    Write-Host "See docs/adding-a-project.md"
    exit 0
}

foreach ($p in $projects) {
    $dest = Join-Path $ProjectsDir $p.name
    if (Test-Path (Join-Path $dest ".git")) {
        Write-Host "  OK  projects/$($p.name) (exists)" -ForegroundColor Green
        continue
    }
    Write-Host "  ->  Cloning $($p.name)..." -ForegroundColor Yellow
    git clone --branch $p.branch $p.repo $dest
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  FAIL projects/$($p.name)" -ForegroundColor Red
    } else {
        Write-Host "  OK  projects/$($p.name)" -ForegroundColor Green
    }
}

Write-Host "`n=== Setup complete ===" -ForegroundColor Green
