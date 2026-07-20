@echo off
title Windows Server 服务器加固脚本

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)


echo 通过注册表关闭 Dnscache 释放 5353 端口...
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Dnscache" /v Start /t REG_DWORD /d 4 /f 
echo Dnscache 已关闭, 需要重启计算机才能生效...
echo.


:: =====================================================
:: 1. 禁用 NetBIOS over TCP/IP
:: 
:: 关闭：
:: UDP 137
:: UDP 138
:: TCP 139
::
:: 影响：
:: 老旧 Windows 网络发现
:: NetBIOS名称解析
::
:: 不影响：
:: SMB TCP 445
:: =====================================================

powershell -Command "Get-CimInstance Win32_NetworkAdapterConfiguration -Filter 'IPEnabled=True' | Invoke-CimMethod -MethodName SetTcpipNetbios -Arguments @{TcpipNetbiosOptions=2}"


:: =====================================================
:: 2. 禁用 LLMNR
::
:: 关闭：
:: UDP 5355
::
:: 功能：
:: Windows局域网名称解析备用协议
::
:: 影响：
:: xxx.local名称解析
::
:: 不影响：
:: 正常DNS
:: =====================================================

reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows NT\DNSClient" /v EnableMulticast /t REG_DWORD /d 0 /f



:: =====================================================
:: 3. 禁用 mDNS
::
:: 关闭：
:: UDP 5353
::
:: 功能：
:: Bonjour / AirPlay / Chromecast / .local发现
::
:: 不影响：
:: 正常DNS
:: SMB
:: RDP
:: Hyper-V
:: =====================================================

reg add "HKLM\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters" /v EnableMDNS /t REG_DWORD /d 0 /f



:: =====================================================
:: 4. 禁用 WinRM
::
:: 关闭：
:: TCP 5985 HTTP远程管理
::
:: 功能：
:: PowerShell远程管理
::
:: 不影响：
:: 本地PowerShell
::
:: =====================================================

sc stop WinRM
sc config WinRM start= disabled



:: =====================================================
:: 5. 禁用网络发现相关服务
::
:: Function Discovery Provider Host
:: Function Discovery Resource Publication
::
:: 关闭：
:: 网络邻居发现
:: 设备自动发现
:: =====================================================

sc stop fdPHost
sc config fdPHost start= disabled


sc stop FDResPub
sc config FDResPub start= disabled



:: =====================================================
:: 6. 禁用 SSDP Discovery
::
:: 关闭：
:: UDP 1900
::
:: 功能：
:: UPnP设备发现
::
:: =====================================================

sc stop SSDPSRV
sc config SSDPSRV start= disabled



:: =====================================================
:: 7. 禁用 UPnP Device Host
::
:: 功能：
:: 管理UPnP设备
::
:: 服务器通常不需要
:: =====================================================

sc stop upnphost
sc config upnphost start= disabled



:: =====================================================
:: 8. 禁用 Print Spooler
::
:: 功能：
:: 打印后台服务
::
:: 历史上存在高危漏洞
::
:: =====================================================

sc stop Spooler
sc config Spooler start= disabled



:: =====================================================
:: 9. 禁用 Remote Registry
::
:: 功能：
:: 远程修改注册表
::
:: 服务器通常不需要
:: =====================================================

sc stop RemoteRegistry
sc config RemoteRegistry start= disabled



:: =====================================================
:: 10. 禁用 Windows Error Reporting
::
:: 功能：
:: 错误信息上传
::
:: =====================================================

sc stop WerSvc
sc config WerSvc start= disabled



:: =====================================================
:: 11. 禁用 Connected User Experiences and Telemetry
::
:: 功能：
:: Windows遥测
::
:: =====================================================

sc stop DiagTrack
sc config DiagTrack start= disabled



echo.
echo =====================================
echo 完成
echo 建议重启服务器
echo =====================================

pause