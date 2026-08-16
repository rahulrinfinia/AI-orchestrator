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

New-Item -ItemType Directory -Force -Path (Join-Path $Root "projects") | Out-Null

function Parse-Projects {
    param([string[]]$Lines)

    $repos = @()
    $inSection = $false
    $current = $null

    foreach ($line in $Lines) {
        if ($line -match '^\s*projects\s*:\s*$') {
            $inSection = $true
            continue
        }
        if ($inSection -and $line -match '^\s*\w+\s*:\s*$' -and $line -notmatch '^\s*-\s*name:') {
            break
        }
        if ($inSection -and $line -match '^\s*-\s*name:\s*(.+)$') {
            if ($current) { $repos += $current }
            $current = @{ name = $Matches[1].Trim(); repo = ""; branch = "main" }
        }
        elseif ($inSection -and $current -and $line -match '^\s*repo:\s*(.+)$') {
            $current.repo = $Matches[1].Trim()
        }
        elseif ($inSection -and $current -and $line -match '^\s*branch:\s*(.+)$') {
            $current.branch = $Matches[1].Trim()
        }
    }
    if ($current) { $repos += $current }
    return $repos | Where-Object { $_.name -and $_.repo -and $_.repo -notmatch '^#' }
}

$lines = Get-Content $ReposFile
$projects = Parse-Projects -Lines $lines
$target = Join-Path $Root "projects"

if ($projects.Count -eq 0) {
    Write-Host "No projects in repos.yaml — see docs/adding-a-project.md" -ForegroundColor Yellow
    exit 0
}

Write-Host "`nProjects:" -ForegroundColor Cyan
foreach ($p in $projects) {
    $dest = Join-Path $target $p.name
    if ((Test-Path (Join-Path $dest ".git")) -and -not $Force) {
        Write-Host "  OK  projects/$($p.name) (exists)" -ForegroundColor Green
        continue
    }
    if (Test-Path $dest) {
        Remove-Item -Recurse -Force $dest
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
Write-Host "Next: project-discovery ipd  (or run from Cursor)"
