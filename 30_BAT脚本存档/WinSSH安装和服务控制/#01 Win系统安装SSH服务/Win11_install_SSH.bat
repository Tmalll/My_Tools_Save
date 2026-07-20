@echo off
:: 安装 OpenSSH 客户端和服务器
dism /online /Add-Capability /CapabilityName:OpenSSH.Client~~~~0.0.1.0
dism /online /Add-Capability /CapabilityName:OpenSSH.Server~~~~0.0.1.0

:: 启动 SSH 服务并设置为自动启动
net start sshd
sc config sshd start= auto

:: 配置防火墙规则
netsh advfirewall firewall add rule name="OpenSSH Server (sshd)" dir=in action=allow protocol=TCP localport=22
netsh advfirewall firewall add rule name="OpenSSH Server (sshd)" dir=in action=allow protocol=TCP localport=60022


echo SSH 服务已成功安装并启动。
pause
