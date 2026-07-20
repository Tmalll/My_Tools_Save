@echo off
echo 更新Everything防火墙规则
netsh advfirewall firewall delete rule name="Everything"
netsh advfirewall firewall add    rule name="Everything" dir=in action=allow protocol=tcp localport=8080 localip=192.168.0.0/16

pause
exit

netsh advfirewall firewall add    rule name="Everything" dir=in action=allow protocol=tcp localport=8080 localip=192.168.0.0/16 program="D:\01.Program_Soft\Everything\Everything.exe"
