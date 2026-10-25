

powershell Restart-NetAdapter '以太网'
ipconfig /flushdns
pause
exit

这个会全部断网一下


重启以太网卡
	ipconfig/release
	ipconfig/renew
	netsh interface set interface "以太网" disabled
	netsh interface set interface "以太网" enabled
	powershell Restart-NetAdapter "以太网"

netsh interface ipv6 reset