@echo off
echo 显示当前优先级列表
netsh interface ipv6 show prefixpolicies
pause
pause
pause

echo 开启高级网络控制
reg delete HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\services\Dnscache\Parameters /v AddrConfigControl /f
reg add HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\services\Dnscache\Parameters /v AddrConfigControl /t REG_DWORD /d 0



netsh interface ipv6 add  prefixpolicy ::ffff:0:0/96 	100 	4
netsh interface ipv6 add  prefixpolicy ::1/128 			50 		0
netsh interface ipv6 add  prefixpolicy ::/0 			40 		1
netsh interface ipv6 add  prefixpolicy 2002::/16 		30 		2
netsh interface ipv6 add  prefixpolicy 2001::/32 		5 		5
netsh interface ipv6 add  prefixpolicy fc00::/7 		3 		13
netsh interface ipv6 add  prefixpolicy fec0::/10 		1 		11
netsh interface ipv6 add  prefixpolicy 3ffe::/16 		1 		12
netsh interface ipv6 add  prefixpolicy ::/96 			1 		3

netsh interface ipv6 set  prefixpolicy ::ffff:0:0/96 	100 	4
netsh interface ipv6 set  prefixpolicy ::1/128 			50 		0
netsh interface ipv6 set  prefixpolicy ::/0 			40 		1
netsh interface ipv6 set  prefixpolicy 2002::/16 		30 		2
netsh interface ipv6 set  prefixpolicy 2001::/32 		5 		5
netsh interface ipv6 set  prefixpolicy fc00::/7 		3 		13
netsh interface ipv6 set  prefixpolicy fec0::/10 		1 		11
netsh interface ipv6 set  prefixpolicy 3ffe::/16 		1 		12
netsh interface ipv6 set  prefixpolicy ::/96 			1 		3

netsh interface ipv6 show prefixpolicies


pause
exit














重置
netsh interface ipv6 reset

默认
	netsh interface ipv6 set  prefixpolicy ::1/128 			50 		0
	netsh interface ipv6 add  prefixpolicy ::/0 			40 		1
	netsh interface ipv6 add  prefixpolicy ::ffff:0:0/96 	35 		4
	netsh interface ipv6 add  prefixpolicy 2002::/16 		30 		2
	netsh interface ipv6 add  prefixpolicy 2001::/32 		5 		5
	netsh interface ipv6 add  prefixpolicy fc00::/7 		3 		13
	netsh interface ipv6 add  prefixpolicy fec0::/10 		1 		11
	netsh interface ipv6 add  prefixpolicy 3ffe::/16 		1 		12
	netsh interface ipv6 add  prefixpolicy ::/96 			1 		3
		50      0  ::1/128
		40      1  ::/0
		35      4  ::ffff:0:0/96
		30      2  2002::/16
		5      5  2001::/32
		3     13  fc00::/7
		1     11  fec0::/10
		1     12  3ffe::/16
		1      3  ::/96









