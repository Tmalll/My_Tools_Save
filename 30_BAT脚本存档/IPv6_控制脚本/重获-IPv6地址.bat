@echo off

:: ===== 自动提权 ===== 
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:设置目标网卡名称
:: ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- 
set faceName=LAN


:执行脚本
:: ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- 
echo 删除接口上的 ipv6 DNS
netsh interface ipv6 delete dnsservers "%faceName%" all
pathping -p 1000 -q 1 localhost >nul 
echo.

echo 删除接口上的 ipv6 地址
powershell "Remove-NetIPAddress -InterfaceAlias '%faceName%' -AddressFamily ipv6 -Confirm:$false"
pathping -p 1000 -q 1 localhost >nul 
echo.

echo 添加本地IPv6地址 第一个ip用 set, 之后的用 add
netsh interface ipv6 set   address interface="%faceName%" address="fe80::192:168:1:120"
:: netsh interface ipv6 add  address interface="%faceName%" address="fe80::192:168:1:xxxx"
pathping -p 1000 -q 1 localhost >nul 
echo.

echo 关闭路由发现
netsh interface ipv6 set interface "%faceName%" routerdiscovery=disabled 
pathping -p 2000 -q 1 localhost >nul 
echo.

echo 开启路由发现
netsh interface ipv6 set interface "%faceName%" routerdiscovery=enabled
pathping -p 1000 -q 1 localhost >nul 
echo.





pause
exit


