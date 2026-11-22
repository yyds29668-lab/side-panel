$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$pythonw = Join-Path $root '.venv\Scripts\pythonw.exe'
if (-not (Test-Path $pythonw)) {
    $pythonw = (Get-Command pythonw.exe -ErrorAction SilentlyContinue).Source
}
if (-not $pythonw) {
    $python = (Get-Command python.exe -ErrorAction Stop).Source
    $pythonw = Join-Path (Split-Path $python) 'pythonw.exe'
}
if (-not (Test-Path $pythonw)) { throw 'pythonw.exe not found. Run scripts\setup.ps1 first.' }
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0

$watchdog = Join-Path $root 'scripts\watchdog.py'
$actionW = New-ScheduledTaskAction -Execute $pythonw -Argument ('"' + $watchdog + '"') -WorkingDirectory $root
$triggerW = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes 3) -RepetitionDuration (New-TimeSpan -Days 3650)
Register-ScheduledTask -TaskName 'SidePanel-Watchdog' -Action $actionW -Trigger $triggerW -Settings $settings -Description 'Side screen panel watchdog' -Force | Out-Null

$maint = Join-Path $root 'scripts\daily_maintenance.py'
$actionM = New-ScheduledTaskAction -Execute $pythonw -Argument ('"' + $maint + '"') -WorkingDirectory $root
$triggerM = New-ScheduledTaskTrigger -Daily -At '04:00'
Register-ScheduledTask -TaskName 'SidePanel-Maint' -Action $actionM -Trigger $triggerM -Settings $settings -Description 'Side screen panel daily maintenance' -Force | Out-Null

Write-Host 'Registered SidePanel-Watchdog (3 min) and SidePanel-Maint (04:00).'
