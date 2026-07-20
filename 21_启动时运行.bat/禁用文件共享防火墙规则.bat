@echo off

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: 最小化窗口
cd /d "%~dp0" & title %~nx0
if "%1" neq "min" start /min "" "%~f0" min & exit
:start_script
echo. timeout /t 15 >nul & echo.
:: 这下面放最小化之后的脚本...

:: 禁用防火墙规则
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetFirewallRule -DisplayGroup '文件和打印机共享*' -Direction Inbound | Sort-Object DisplayName | ForEach-Object { Write-Host ' - 已禁用规则: ' $_.DisplayName -ForegroundColor Red; $_ } | Set-NetFirewallRule -Enabled False; Write-Host ([Environment]::NewLine + '[-] 文件和打印机共享组规则已全部禁用完成。') -ForegroundColor Red"


timeout /t 5 && timeout /t 5 && timeout /t 5
exit


