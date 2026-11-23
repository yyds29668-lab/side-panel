$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$today = Join-Path $root 'data\cache\today.json'
if (-not (Test-Path $today)) { throw "data\cache\today.json not found. Write or import today's guide first." }
$data = Get-Content $today -Raw -Encoding UTF8 | ConvertFrom-Json
$local = (Get-Date).ToString('yyyy-MM-dd')
if ($data.date -ne $local) { throw "today.json date is $($data.date), local date is $local. Refusing to sync." }

$py = Join-Path $root '.venv\Scripts\python.exe'
if (-not (Test-Path $py)) { $py = (Get-Command python -ErrorAction Stop).Source }

Write-Host "Syncing guide $($data.date): weather / news / GitHub / classics"
& $py (Join-Path $root 'scripts\refresh_daily.py')
if ($LASTEXITCODE -ne 0) { Write-Warning 'One or more collectors failed; panel will keep the last good cache.' }

$watch = Join-Path $root 'design\ui.js'
(Get-Item $watch).LastWriteTime = Get-Date
Start-Sleep -Seconds 2
Write-Host 'Panel reload signal sent. If the panel is collapsed, click the top-left dot.'
Write-Host ("Today: {0} grade: {1} hexagram: {2} -> {3}" -f $data.date, $data.grade, $data.hexagram.primary, $data.hexagram.changed)
