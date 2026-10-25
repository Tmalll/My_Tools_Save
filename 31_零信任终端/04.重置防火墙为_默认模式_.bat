@echo off

:: ===== 提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

echo 请确认是否执行, 这可能导致服务器失联...
pause
echo 请确认是否执行, 这可能导致服务器失联...
pause
echo 请确认是否执行, 这可能导致服务器失联...
pause

echo 重置防火墙
netsh advfirewall reset
echo.
timeout /t 1 > NUL


echo 清空 DNS 缓存
ipconfig /flushdns > NUL
echo.
timeout /t 1 > NUL


echo 关闭防火墙通知, 默认是开启 enbale, 关闭后程序被阻止后不会通知.
netsh advfirewall set allprofiles settings inboundusernotification disable
echo.
timeout /t 1 > NUL


:开启端口_RDP_3389
echo 开启RDP的3389端口.
netsh advfirewall firewall delete rule name="Remote Desktop 3389"
timeout /t 1 > NUL
echo.
netsh advfirewall firewall add rule name="Remote Desktop 3389" dir=in action=allow protocol=TCP localport=3389
timeout /t 1 > NUL
echo.

:开启端口_SMB_445
echo 开启SMB的445端口.
netsh advfirewall firewall delete rule name="SMB 445"
timeout /t 1 > NUL
echo.
netsh advfirewall firewall add rule name="SMB 445" dir=in action=allow protocol=TCP localport=445
timeout /t 1 > NUL
echo.

pause
exit








