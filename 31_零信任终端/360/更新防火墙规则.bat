@echo off

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

:: 更新防火墙规则...
netsh advfirewall firewall delete rule name="mihomo.exe"
timeout /t 1 > NUL
netsh advfirewall firewall add rule name="mihomo.exe" dir=in    action=allow protocol=tcp  program="%~dp0#core_and_data\mihomo.exe"
netsh advfirewall firewall add rule name="mihomo.exe" dir=in    action=allow protocol=udp  program="%~dp0#core_and_data\mihomo.exe"
netsh advfirewall firewall add rule name="mihomo.exe" dir=in    action=allow protocol=any  program="%~dp0#core_and_data\mihomo.exe"
netsh advfirewall firewall add rule name="mihomo.exe" dir=out   action=allow protocol=tcp  program="%~dp0#core_and_data\mihomo.exe"
netsh advfirewall firewall add rule name="mihomo.exe" dir=out   action=allow protocol=udp  program="%~dp0#core_and_data\mihomo.exe"
netsh advfirewall firewall add rule name="mihomo.exe" dir=out   action=allow protocol=any  program="%~dp0#core_and_data\mihomo.exe"

pause
exit
