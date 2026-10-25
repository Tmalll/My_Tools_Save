@echo off 

sc stop "sshd"
choice /t 1 /d y /n >nul
del /s /q "C:\ProgramData\ssh\logs\sshd.log"
choice /t 1 /d y /n >nul
sc start "sshd"
sc config "sshd" start= auto
sc failure "sshd" reset= 0 actions= restart/5000/restart/15000/restart/30000

netsh advfirewall firewall delete rule name=OpenSSH_Port
netsh advfirewall firewall add rule name=OpenSSH_Port dir=in action=allow protocol=tcp  localport=any program="C:\Windows\System32\OpenSSH\sshd.exe"

type "C:\ProgramData\ssh\logs\sshd.log"

pause
exit
