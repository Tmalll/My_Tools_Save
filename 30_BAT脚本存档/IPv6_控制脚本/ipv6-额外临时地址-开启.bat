@echo off

echo 临时地址 - 开启
powershell Set-NetIPv6Protocol -UseTemporaryAddresses Enabled
pathping -p 500 -q 1 localhost >nul

set interfaceNAME=以太网
echo 确认是否重启网络 %interfaceNAME%
pause

netsh interface set interface "%interfaceNAME%" disabled
pathping -p 500 -q 1 localhost >nul

netsh interface set interface "%interfaceNAME%" enabled
pathping -p 500 -q 1 localhost >nul



pause
exit
