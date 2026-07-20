@echo off

:: 需要恢复的网卡名称
set "iface=以太网"

:: ===== 提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

:: echo 重置网络套接字
:: netsh winsock reset
:: echo.

:: echo 重置 TCP/IP 栈
:: netsh int ip reset
:: echo.

:: ---------- 还原 IPv4 部分 ----------
netsh interface ip set address name="%iface%" source=dhcp
netsh interface ip set dnsservers name="%iface%" source=dhcp

:: ---------- 还原 IPv6 部分 ----------
netsh interface ipv6 delete dnsservers "%iface%" all
powershell "Remove-NetIPAddress -InterfaceAlias '%iface%' -AddressFamily ipv6 -Confirm:$false"
netsh interface ipv6 reset

:: ---------- 重启网卡 ----------
powershell Restart-NetAdapter '%iface%'
ipconfig /flushdns


pause
exit /b
