pause
pause
pause

echo 结束进程
sc stop "sshd"
sc stop "ssh-agent"
choice /t 1 /d y /n >nul
taskkill /f /im sshd.exe
taskkill /f /im ssh-agent.exe
choice /t 1 /d y /n >nul

echo 删除日志和原来的公钥
del /s /q "C:\ProgramData\ssh\logs\sshd.log"



echo 下载公钥
del /s /q "C:\ProgramData\ssh\administrators_authorized_keys"
"%~dp0\curl\curl.exe" https://home.miaosky.party:8443/files/04_sshkey/01_VPS_use_key/id_MiaoSKY_ed25519.pub --anyauth --user "master:qwe123!!@@"  >> "C:\\ProgramData\\ssh\\administrators_authorized_keys"
"%~dp0\curl\curl.exe" https://home.miaosky.party:8443/files/04_sshkey/02_SCPkey_WinMaster/SCPkey_WinMaster.pub --anyauth --user "master:qwe123!!@@"  >> "C:\\ProgramData\\ssh\\administrators_authorized_keys"
pause
cls

echo 下载sshd的配置文件
del /s /q "C:\ProgramData\ssh\sshd_config"
"%~dp0\curl\curl.exe" https://home.miaosky.party:8443/files/04_sshkey/WinSSHD_config/sshd_config --anyauth --user "master:qwe123!!@@" >> "C:\ProgramData\ssh\sshd_config"
pause
cls

echo 给公钥设置权限
icacls C:\ProgramData\ssh\administrators_authorized_keys /inheritance:r
icacls C:\ProgramData\ssh\administrators_authorized_keys /grant SYSTEM:(F)
icacls C:\ProgramData\ssh\administrators_authorized_keys /grant BUILTIN\Administrators:(F)

echo 重置防火墙
netsh advfirewall firewall delete rule name="OpenSSH_Port"
netsh advfirewall firewall add    rule name="OpenSSH_Port" dir=in action=allow protocol=tcp localport=any program="C:\Windows\System32\OpenSSH\sshd.exe"
choice /t 1 /d y /n >nul

echo 重启ssh服务
sc stop "sshd"
sc start "sshd"
sc config "sshd" start= auto
sc failure "sshd" reset= 0 actions= restart/5000/restart/15000/restart/30000
choice /t 1 /d y /n >nul

echo 重启ssh-agent服务
sc stop "ssh-agent"
sc start "ssh-agent"
sc config "ssh-agent" start= auto
sc failure "ssh-agent" reset= 0 actions= restart/5000/restart/15000/restart/30000
choice /t 1 /d y /n >nul

sc start "ssh-agent"
sc start "sshd"
choice /t 1 /d y /n >nul


type   "C:\\ProgramData\\ssh\\administrators_authorized_keys"
type   "C:\ProgramData\ssh\logs\sshd.log"
type   "C:\ProgramData\ssh\sshd_config"


pause
exit





























netsh advfirewall firewall add    rule name="OpenSSH_Port" dir=in action=allow protocol=tcp localport=60022
netsh advfirewall firewall add    rule name="OpenSSH_Port" dir=in action=allow protocol=tcp localport=22

curl -L -o "C:\\ProgramData\\ssh\\administrators_authorized_keys"   "https://home-cdn.miaosky.party:8443/04-SSH_KEY/02_SCPkey_WinMaster/SCPkey_WinMaster.pub" -u "master":"qwe123!!@@"
type "C:\\ProgramData\\ssh\\administrators_authorized_keys"