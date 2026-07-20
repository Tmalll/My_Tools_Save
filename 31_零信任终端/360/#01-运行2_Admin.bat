@echo off
cd /d "%~dp0" & title %~nx0

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

echo 结束后台程序...
taskkill /f /t /im #mihomo.exe
taskkill /f /t /im #mihomo.exe
taskkill /f /t /im #mihomo.exe
timeout /t 2 > NUL
echo.

rem echo 删除日志文件...
rem del /s /q "%~dp0\mihomo_RunLOG.log"
rem del /s /q "%~dp0\mihomo_RunLOG.log"
rem del /s /q "%~dp0\mihomo_RunLOG.log"
rem timeout /t 2 > NUL
rem echo.

start "" "%~dp0\#01-运行1_User.bat" /b /wait









