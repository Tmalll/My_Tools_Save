@echo off
mode con: cols=160 lines=40
powershell -Command "$h = Get-Host; $ui = $h.UI.RawUI; $ui.BufferSize = New-Object System.Management.Automation.Host.Size($ui.BufferSize.Width, 9999)"


taskkill /f /t /im xray.exe
pathping -p 100 -q 1 localhost >nul
taskkill /f /t /im xray.exe
pathping -p 100 -q 1 localhost >nul
taskkill /f /t /im xray.exe
pathping -p 100 -q 1 localhost >nul

del /s /q error.log
pathping -p 100 -q 1 localhost >nul

cls
start /min /b "" %~dp0xray.exe

exit


