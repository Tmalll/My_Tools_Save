@echo off
mode con: cols=80 lines=20
powershell -Command "$h = Get-Host; $ui = $h.UI.RawUI; $ui.BufferSize = New-Object System.Management.Automation.Host.Size($ui.BufferSize.Width, 9999)"


taskkill /f /t /im xray.exe
pathping -p 100 -q 1 localhost >nul
taskkill /f /t /im xray.exe
pathping -p 100 -q 1 localhost >nul
taskkill /f /t /im xray.exe
pathping -p 100 -q 1 localhost >nul

del /s /q error.log
pathping -p 100 -q 1 localhost >nul

start /min "" %~dp0xray.exe

exit


