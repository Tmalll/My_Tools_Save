@echo off
set interface=以太网

set MainIP=192.168.1.100
set MainIPMask=255.255.255.0
set OtherIP=
set OtherIPMask=

set MainGateway=192.168.1.10
set MainGateway跃点=0

set OtherGateway=
set OtherGateway跃点=0

set MainDNS=192.168.1.95
set OtherDNS1=223.5.5.5
set OtherDNS2=223.6.6.6
set OtherDNS3=
set OtherDNS4=

@title "设置主要IP地址和网络掩码。"
echo 设置主要IP地址和网络掩码。
netsh interface ip set address "%interface%" source=static addr=%MainIP% mask=%MainIPMask%

@title "添加额外IP地址和掩码"
echo 添加额外IP地址和掩码
netsh interface ip add address "%interface%"  addr=%OtherIP% mask=%OtherIPMask%

@title "设置网关地址"
echo 设置网关地址
netsh interface ip add address name="%interface%" gateway=%MainGateway% gwmetric=%MainGateway跃点%
netsh interface ip add address name="%interface%" gateway=%OtherGateway% gwmetric=%OtherGateway跃点%


@title "设置DNS地址"
echo 设置DNS地址
netsh interface ip set dns name="%interface%" source=static addr=%MainDNS%
netsh interface ip add dns name="%interface%" addr=%OtherDNS1%
netsh interface ip add dns name="%interface%" addr=%OtherDNS2%
netsh interface ip add dns name="%interface%" addr=%OtherDNS3%
netsh interface ip add dns name="%interface%" addr=%OtherDNS4%
ipconfig /flushdns

@title "设置已完成，1秒后关闭窗口"
echo 设置已完成，1秒后关闭窗口
choice /t 1 /d y /n >nul

CLS
IPCONFIG /ALL
PAUSE

exit

