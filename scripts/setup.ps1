$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$python = (Get-Command python -ErrorAction Stop).Source
if (-not (Test-Path (Join-Path $root '.venv'))) {
    & $python -m venv (Join-Path $root '.venv')
}
$venvPy = Join-Path $root '.venv\Scripts\python.exe'
& $venvPy -m pip install --upgrade pip
& $venvPy -m pip install -r (Join-Path $root 'requirements.txt')

if (-not (Test-Path (Join-Path $root 'config.json'))) {
    Copy-Item (Join-Path $root 'config.example.json') (Join-Path $root 'config.json')
}
& $venvPy (Join-Path $root 'scripts\bootstrap.py')
Write-Host ''
Write-Host 'Setup complete. Start with:'
Write-Host ('  ' + (Join-Path $root '.venv\Scripts\python.exe') + ' app\qt_main.py')
Write-Host 'Edit config.json for screen and weather.'
