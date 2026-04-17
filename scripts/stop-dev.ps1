$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root ".tmp\dev\pids.json"

if (-not (Test-Path $pidFile)) {
    Write-Host "PID file not found: $pidFile"
    exit 0
}

$items = Get-Content -Raw $pidFile | ConvertFrom-Json

foreach ($item in $items) {
    if (-not $item.pid -or $item.pid -eq 0) {
        continue
    }
    try {
        Stop-Process -Id $item.pid -Force -ErrorAction Stop
        Write-Host "Stopped $($item.name) (PID $($item.pid))"
    } catch {
        Write-Host "Skip $($item.name) (PID $($item.pid)) - already exited or inaccessible"
    }
}

Remove-Item -Force $pidFile -ErrorAction SilentlyContinue
Write-Host "Done."
