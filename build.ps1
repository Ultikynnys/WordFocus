<#
.SYNOPSIS
    Builds the OneWordReader release artifact on Windows.
.DESCRIPTION
    Windows convenience wrapper around the cross-platform Bun release script.
#>

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

function Write-Step($Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

if (!(Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: 'bun' not found. Install it and try again." -ForegroundColor Red
    exit 1
}

Write-Step "Building release artifact via Bun"
Push-Location $ProjectRoot
bun run build:release
$exitCode = $LASTEXITCODE
Pop-Location

if ($exitCode -ne 0) {
    exit $exitCode
}
