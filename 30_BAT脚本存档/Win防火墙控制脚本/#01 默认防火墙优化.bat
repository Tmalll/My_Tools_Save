@echo off

echo 重置防火墙
netsh advfirewall reset

echo 禁用防火墙通知
reg delete "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\DomainProfile" /v DisableNotifications /f
reg delete "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\PublicProfile" /v DisableNotifications /f
reg delete "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\StandardProfile" /v DisableNotifications /f
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\DomainProfile" /v "DisableNotifications" /t "REG_DWORD" /d 00000001 /f
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\PublicProfile" /v "DisableNotifications" /t "REG_DWORD" /d 00000001 /f
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\StandardProfile" /v "DisableNotifications" /t "REG_DWORD" /d 00000001 /f

echo 关闭 远程协助 在 入站 和 出站
powershell "Set-NetFirewallRule -DisplayGroup '*远程协助*' -Enabled False"

echo 开启 远程桌面 在入站 限定只在本地v4地址上开启 又限定只有本地子网的远程ip可访问
powershell "Get-NetFirewallRule -DisplayGroup '*远程桌面*' -Direction Inbound | Set-NetFirewallRule -Enabled False"
powershell "Get-NetFirewallRule -DisplayGroup '*远程桌面*' -Direction Inbound | Set-NetFirewallRule -Enabled True"
powershell "Get-NetFirewallRule -DisplayGroup '*远程桌面*' -Direction Inbound | Set-NetFirewallRule -LocalAddress 192.168.0.0/16 -RemoteAddress LocalSubnet"

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

echo ----------------------------------------------------------------------------------------------------

echo 禁止 外网ping本主机
powershell "Get-NetFirewallRule -DisplayGroup '*核心网络诊断*' -Direction Inbound | Set-NetFirewallRule -Enabled False"

echo 禁止 播放到设备 在入站
powershell "Get-NetFirewallRule -DisplayGroup '*播放到设备*' -Direction Inbound | Set-NetFirewallRule -Enabled False"

echo 禁止 SSH 在入站
powershell "Get-NetFirewallRule -DisplayGroup '*OpenSSH*' -Direction Inbound | Set-NetFirewallRule -Enabled False"

echo 禁止 Edge 在入站
powershell "Get-NetFirewallRule -DisplayGroup '*Edge*' -Direction Inbound | Set-NetFirewallRule -Enabled False"

echo 禁止 ipv6公网的入站通信
netsh advfirewall firewall delete rule name="block_ipv6_in"
netsh advfirewall firewall add    rule name="block_ipv6_in" dir=in action=block protocol=tcp localport=any remoteip="2000::/3"
netsh advfirewall firewall add    rule name="block_ipv6_in" dir=in action=block protocol=udp localport=any remoteip="2000::/3"

echo 允许 explorer 内网通信
netsh advfirewall firewall delete rule name="explorer"
netsh advfirewall firewall add    rule name="explorer" dir=in action=allow protocol=tcp localport=any localip=192.168.0.0/16 program="C:\Windows\explorer.exe"
netsh advfirewall firewall add    rule name="explorer" dir=in action=allow protocol=udp localport=any localip=192.168.0.0/16 program="C:\Windows\explorer.exe"

pause
exit













pause
exit

















PS创建规则
powershell New-NetFirewallRule -DisplayName "公网RDP端口=12345" -Protocol TCP -LocalPort 12345 -Action Allow
powershell New-NetFirewallRule -DisplayName "VM_SSH_P20022" -Protocol TCP -LocalPort 20022 -Action Allow

PS脚本简化
$NR = Get-NetFirewallRule -DisplayGroup "网络发现" -Direction Inbound
$NR = $NR | Where-Object DisplayName -NotMatch "Teredo"  
$NR | Set-NetFirewallRule -Enabled False
$NR | Set-NetFirewallRule -Enabled True
$NR | Set-NetFirewallRule -LocalAddress 192.168.0.0/16 -RemoteAddress LocalSubnet



结合变量排除不要的选项
$NR = Get-NetFirewallRule -DisplayGroup "网络发现" -Direction Inbound  
$NR = $NR | Where-Object DisplayName -NotMatch "Teredo"  
$NR | Format-Table


查找
Get-NetFirewallRule -DisplayGroup "*核心网络诊断*" -Direction Inbound  | Format-Table  
Get-NetFirewallRule -DisplayGroup "核心网络诊断" -Direction Outbound | Format-Table




结合查找只操作入站或者出站
Get-NetFirewallRule -DisplayGroup "*文件和打印机共享*" -Direction Inbound | Set-NetFirewallRule -Enabled True


参考
-Direction Inbound, Outbound
-RemoteAddress any LocalSubnet LocalSubnet4 LocalSubnet6 internet



powershell Set-NetFirewallRule -DisplayName '文件和打印机共享(回显请求 - ICMPv6-In)' -Enabled False
powershell Set-NetFirewallRule -DisplayName '文件和打印机共享(回显请求 - ICMPv6-In)' -Enabled True
powershell Set-NetFirewallRule -DisplayName '文件和打印机共享(回显请求 - ICMPv6-In)' -RemoteAddress internet
powershell Set-NetFirewallRule -DisplayName '文件和打印机共享(回显请求 - ICMPv6-In)' -Enabled False
powershell Set-NetFirewallRule -DisplayName '文件和打印机共享(回显请求 - ICMPv6-In)' -Enabled True
powershell Set-NetFirewallRule -DisplayName '文件和打印机共享(回显请求 - ICMPv6-In)' -LocalAddress LocalSubnet -RemoteAddress any
powershell Set-NetFirewallRule -DisplayGroup "远程协助" -Direction Inbound -Enabled False
powershell Set-NetFirewallRule -DisplayGroup "远程协助" -Direction Inbound -Enabled True
powershell Set-NetFirewallRule -DisplayGroup "远程协助" -Direction Inbound -LocalAddress 192.168.0.0/16 -RemoteAddress any












pause