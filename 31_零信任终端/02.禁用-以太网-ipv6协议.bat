@echo off

:: ===== ÌáÈ¨ =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)



powershell Disable-NetAdapterBinding -Name "ÒÔÌ«Íø" -ComponentID ms_tcpip6



pause
exit
