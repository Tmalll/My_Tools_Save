@echo off
netsh advfirewall firewall delete rule name=OpenSSH_Port
netsh advfirewall firewall add    rule name=OpenSSH_Port dir=in action=allow protocol=tcp localport=60022

pause
exit
C:\Program Files (x86)\SogouInput\8.9.0.2180\SGTool.exe

netsh advfirewall firewall add    rule name=OpenSSH_Port dir=in action=allow protocol=tcp localport=60022 program="C:\Windows\System32\OpenSSH\sshd.exe"
