@echo off

:: ===== 提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

echo 请确认是否执行, 这可能导致服务器失联...
pause && echo.
echo 请确认是否执行, 这可能导致服务器失联...
pause && echo.
echo 请确认是否执行, 这可能导致服务器失联...
pause && echo.

echo.
echo.
echo ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------
echo.
echo.


:重置防火墙
echo 重置防火墙
netsh advfirewall reset
timeout /t 1 > NUL
echo ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------
echo.
echo.

:: echo 设置防火墙规则, 阻止入站, 允许出站, 默认值.
:: netsh advfirewall set allprofiles firewallpolicy blockinbound,allowoutbound
:: timeout /t 1 > NUL
:: echo.

echo 设置防火墙规则为: 默认阻止入站 + 默认阻止出站.
netsh advfirewall set allprofiles firewallpolicy blockinbound,blockoutbound
timeout /t 1 > NUL
echo ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------
echo.
echo.


echo 禁用所有内置规则, 设置为不启用, 但是不删除它们.
powershell -NoProfile -ExecutionPolicy Bypass "Get-NetFirewallRule | Disable-NetFirewallRule"
timeout /t 1 > NUL
echo ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------
echo.
echo.


echo 关闭防火墙通知, 默认是开启 enbale, 关闭后程序被阻止后不会通知.
netsh advfirewall set allprofiles settings inboundusernotification disable
timeout /t 1 > NUL
echo ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------
echo.
echo.


echo 清空 DNS 缓存
ipconfig /flushdns > NUL
timeout /t 1 > NUL
echo ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------
echo.
echo.


:开启_入站_端口_RDP_3389
echo 开启RDP的3389端口.
netsh advfirewall firewall delete rule name="Remote Desktop 3389"
timeout /t 1 > NUL
echo.
netsh advfirewall firewall add rule name="Remote Desktop 3389" dir=in action=allow protocol=TCP localport=3389 localip=192.168.0.0/16
timeout /t 1 > NUL
echo ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------
echo.
echo.


:开启_入站_端口_SMB_445
echo 开启SMB的445端口.
netsh advfirewall firewall delete rule name="SMB 445"
timeout /t 1 > NUL
echo.
netsh advfirewall firewall add rule name="SMB 445" dir=in  action=allow protocol=TCP localport=445  localip=192.168.0.0/16
netsh advfirewall firewall add rule name="SMB 445" dir=out action=allow protocol=TCP remoteport=445 remoteip=localsubnet


timeout /t 1 > NUL
echo ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------
echo.
echo.


:开启_出站_端口_to_内网DNS_53
echo 开启, 出站通信, DNS的53端口.
netsh advfirewall firewall delete rule name="DNS 53"
timeout /t 1 > NUL
echo.
netsh advfirewall firewall add rule name="DNS 53" dir=out action=allow protocol=UDP remoteport=53 remoteip=localsubnet
timeout /t 1 > NUL
echo ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------
echo.
echo.


:开启_出站_端口_to_内网NTP_123
echo 开启, 出站通信, NTP的123端口.
netsh advfirewall firewall delete rule name="NTP 123"
timeout /t 1 > NUL
echo.
netsh advfirewall firewall add rule name="NTP 123" dir=out action=allow protocol=UDP remoteport=123 remoteip=localsubnet
timeout /t 1 > NUL
echo ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------
echo.
echo.



pause
exit
:: ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------




echo 开启 文件和打印机共享 在入站 限定只在本地v4地址上开启 又限定只有本地子网的远程ip可访问
powershell "Get-NetFirewallRule -DisplayGroup '*文件和打印机共享*' -Direction Inbound | Set-NetFirewallRule -Enabled False"
powershell "Get-NetFirewallRule -DisplayGroup '*文件和打印机共享*' -Direction Inbound | Set-NetFirewallRule -Enabled True"
powershell "Get-NetFirewallRule -DisplayGroup '*文件和打印机共享*' -Direction Inbound | Set-NetFirewallRule -LocalAddress 192.168.0.0/16 -RemoteAddress LocalSubnet"

echo 开启 网络发现 在入站 排除Teredo 限定只在本地v4地址上开启 又限定只有本地子网的远程ip可访问
powershell "Get-NetFirewallRule -DisplayGroup '网络发现' -Direction Inbound | Where-Object DisplayName -NotMatch 'Teredo' | Set-NetFirewallRule -Enabled False"
powershell "Get-NetFirewallRule -DisplayGroup '网络发现' -Direction Inbound | Where-Object DisplayName -NotMatch 'Teredo' | Set-NetFirewallRule -Enabled True"
powershell "Get-NetFirewallRule -DisplayGroup '网络发现' -Direction Inbound | Where-Object DisplayName -NotMatch 'Teredo' | Set-NetFirewallRule -LocalAddress 192.168.0.0/16 -RemoteAddress LocalSubnet"


echo 开启 核心网络 在入站 排除核心网络诊断 其他的设置默认
powershell "Get-NetFirewallRule -DisplayGroup '*核心网络*' -Direction Inbound | Where-Object DisplayName -NotMatch '核心网络诊断' | Set-NetFirewallRule -Enabled False"
powershell "Get-NetFirewallRule -DisplayGroup '*核心网络*' -Direction Inbound | Where-Object DisplayName -NotMatch '核心网络诊断' | Set-NetFirewallRule -Enabled True"

echo 关闭 远程协助 在 入站 和 出站
powershell "Set-NetFirewallRule -DisplayGroup '*远程协助*' -Enabled False"

echo 开启 远程桌面 在入站 限定只在本地v4地址上开启 又限定只有本地子网的远程ip可访问
powershell "Get-NetFirewallRule -DisplayGroup '*远程桌面*' -Direction Inbound | Set-NetFirewallRule -Enabled False"
powershell "Get-NetFirewallRule -DisplayGroup '*远程桌面*' -Direction Inbound | Set-NetFirewallRule -Enabled True"
powershell "Get-NetFirewallRule -DisplayGroup '*远程桌面*' -Direction Inbound | Set-NetFirewallRule -LocalAddress 192.168.0.0/16 -RemoteAddress LocalSubnet"



[localport=0-65535|<port range>[,...]|RPC|RPC-EPMap|IPHTTPS|any (default=any)]
[localip=any|<IPv4 address>|<IPv6 address>|<subnet>|<range>|<list>]


[remoteport=0-65535|<port range>[,...]|any (default=any)]
[remoteip=any|localsubnet|dns|dhcp|wins|defaultgateway|<IPv4 address>|<IPv6 address>|<subnet>|<range>|<list>]



Microsoft Windows [版本 10.0.26100.8655]
(c) Microsoft Corporation。保留所有权利。

C:\Users\Administrator>netsh advfirewall firewall add rule /?

用法: add rule name=<string>
      dir=in|out
      action=allow|block|bypass
      [program=<program path>]
      [service=<service short name>|any]
      [description=<string>]
      [enable=yes|no (default=yes)]
      [profile=public|private|domain|any[,...]]
      [localip=any|<IPv4 address>|<IPv6 address>|<subnet>|<range>|<list>]
      [remoteip=any|localsubnet|dns|dhcp|wins|defaultgateway|
         <IPv4 address>|<IPv6 address>|<subnet>|<range>|<list>]
      [localport=0-65535|<port range>[,...]|RPC|RPC-EPMap|IPHTTPS|any (default=any)]
      [remoteport=0-65535|<port range>[,...]|any (default=any)]
      [protocol=0-255|icmpv4|icmpv6|icmpv4:type,code|icmpv6:type,code|
         tcp|udp|any (default=any)]
      [interfacetype=wireless|lan|ras|any]
      [rmtcomputergrp=<SDDL string>]
      [rmtusrgrp=<SDDL string>]
      [edge=yes|deferapp|deferuser|no (default=no)]
      [security=authenticate|authenc|authdynenc|authnoencap|notrequired
         (default=notrequired)]
         






































