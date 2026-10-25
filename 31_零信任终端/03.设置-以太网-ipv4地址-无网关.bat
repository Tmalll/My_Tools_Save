@echo off

:: ===== 提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)


:: 设置接口名称
set "iface=以太网"


echo 还原 IPv4 的IP设置...
netsh interface ip set address name="%iface%" source=dhcp
pathping -p 333 -q 1 localhost >nul
netsh interface ip set dnsservers name="%iface%" source=dhcp
pathping -p 333 -q 1 localhost >nul

echo 设置IP地址和网络掩码
:: 这里的 gateway=none 表示不设置网关, 此处如果不指定则可以用下面的命令单独来设置或添加网关.
netsh interface ip set address "%iface%" source=static addr=192.168.1.100 mask=255.255.255.0 gateway=none

:: echo 添加额外IP
:: netsh interface ip add address "%iface%" addr=192.168.88.121 mask=255.255.255.0

:: echo "设置网关地址"
:: 这里的 gwmetric=0 是网关跃点, 0为自动.
:: 如果需要取消网关, 则需要在 netsh interface ip set address 中指定 gateway=none
:: netsh interface ip add address name="%iface%" gateway=192.168.1.33 gwmetric=0

:: echo "设置【物理网络】DNS地址"
:: netsh interface ip set dns name="%iface%" source=static addr=192.168.88.99
:: netsh interface ip add dns name="%iface%" addr=192.168.88.131
:: netsh interface ip add dns name="%iface%" addr=192.168.88.130

ipconfig /flushdns
pause
exit





