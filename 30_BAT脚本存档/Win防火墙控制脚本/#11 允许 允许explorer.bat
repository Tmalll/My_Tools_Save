@echo off
echo 允许 explorer 内网通信
netsh advfirewall firewall delete rule name="explorer"
netsh advfirewall firewall add    rule name="explorer" dir=in action=allow protocol=tcp localport=any localip=192.168.0.0/16 program="C:\Windows\explorer.exe"
netsh advfirewall firewall add    rule name="explorer" dir=in action=allow protocol=udp localport=any localip=192.168.0.0/16 program="C:\Windows\explorer.exe"


pause
exit

