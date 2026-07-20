@echo off

set interfaceNAME=以太网

powershell Set-NetIPInterface -InterfaceAlias '%interfaceNAME%' -addressFamily IPv6 -dhcp Enabled

echo 确认是否重启网络 %interfaceNAME%
pause

netsh interface set interface "%interfaceNAME%" disabled
pathping -p 500 -q 1 localhost >nul

netsh interface set interface "%interfaceNAME%" enabled
pathping -p 500 -q 1 localhost >nul



pause
exit
