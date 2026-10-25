@echo off

:: 最小化窗口
cd /d "%~dp0" & title %~nx0
if "%1" neq "min" start /min "" "%~f0" min & exit
:start_script
echo. timeout /t 15 >nul & echo.
:: 这下面放最小化之后的脚本...

powershell -ExecutionPolicy Bypass -File #powershell_proxy_run.ps1

exit















start "" "cmd /k "
del /q proxy.ps1.log
powershell -ExecutionPolicy Bypass -File #powershell_proxy_run.ps1

exit

  >  proxy.ps1.log