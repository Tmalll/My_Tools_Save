set faceName=以太网

echo 开关ipv6路由发现
netsh interface ipv6 set interface "%faceName%" routerdiscovery=disabled
pathping -p 300 -q 1 localhost >nul
netsh interface ipv6 set interface "%faceName%" routerdiscovery=enabled
ipconfig /flushdns
echo.





开启关闭路由发现
https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipinterface?view=windowsserver2022-ps#-routerdiscovery
Set-NetIPInterface -InterfaceAlias '以太网' -RouterDiscovery disabled
Set-NetIPInterface -InterfaceAlias '以太网' -RouterDiscovery enabled
关闭在开启后可重新获取IP地址