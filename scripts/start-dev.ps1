param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$stateDir = Join-Path $root ".tmp\dev"
$pidFile = Join-Path $stateDir "pids.json"

New-Item -ItemType Directory -Force -Path $stateDir | Out-Null

function Start-ManagedProcess {
    param(
        [string]$Name,
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory
    )

    if ($DryRun) {
        Write-Host "[DryRun] $Name -> $FilePath $($Arguments -join ' ')"
        return [PSCustomObject]@{
            name = $Name
            pid = 0
            command = "$FilePath $($Arguments -join ' ')"
            workdir = $WorkingDirectory
        }
    }

    $proc = Start-Process `
        -FilePath $FilePath `
        -ArgumentList $Arguments `
        -WorkingDirectory $WorkingDirectory `
        -PassThru

    return [PSCustomObject]@{
        name = $Name
        pid = $proc.Id
        command = "$FilePath $($Arguments -join ' ')"
        workdir = $WorkingDirectory
    }
}

$entries = @()

$entries += Start-ManagedProcess `
    -Name "backend" `
    -FilePath "flask" `
    -Arguments @("--app", "app", "run", "--port", "5000") `
    -WorkingDirectory $backendDir

$entries += Start-ManagedProcess `
    -Name "frontend" `
    -FilePath "npm" `
    -Arguments @("run", "dev", "--", "--host", "127.0.0.1", "--port", "5173") `
    -WorkingDirectory $frontendDir

$entries | ConvertTo-Json | Set-Content -Encoding UTF8 $pidFile

Write-Host "Started dev services."
Write-Host "Backend:  http://127.0.0.1:5000"
Write-Host "Frontend: http://127.0.0.1:5173"
Write-Host "PID file: $pidFile"
