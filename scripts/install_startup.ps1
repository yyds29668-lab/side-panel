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
$script = Join-Path $root 'app\qt_main.py'
$action = New-ScheduledTaskAction -Execute $pythonw -Argument ('"' + $script + '"') -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtLogOn
$trigger.Delay = 'PT20S'
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0
Register-ScheduledTask -TaskName 'SidePanel-Startup' -Action $action -Trigger $trigger -Settings $settings -Description 'Side screen panel at login' -Force | Out-Null
Write-Host 'Registered SidePanel-Startup. It will appear 20 seconds after login.'
