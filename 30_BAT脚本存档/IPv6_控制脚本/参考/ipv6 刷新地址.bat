::::::::::::::::::::::::::::::::::::::::::::
:: Elevate.cmd - Version 2
:: Automatically check & get admin rights
::::::::::::::::::::::::::::::::::::::::::::
@echo off
CLS
ECHO.
ECHO =============================
ECHO Running Admin shell
ECHO =============================

:init
setlocal DisableDelayedExpansion
set "batchPath=%~0"
for %%k in (%0) do set batchName=%%~nk
set "vbsGetPrivileges=%temp%\OEgetPriv_%batchName%.vbs"
setlocal EnableDelayedExpansion

:checkPrivileges
NET FILE 1>NUL 2>NUL
if '%errorlevel%' == '0' ( goto gotPrivileges ) else ( goto getPrivileges )

:getPrivileges
if '%1'=='ELEV' (echo ELEV & shift /1 & goto gotPrivileges)
ECHO.
ECHO **************************************
ECHO Invoking UAC for Privilege Escalation
ECHO **************************************

ECHO Set UAC = CreateObject^("Shell.Application"^) > "%vbsGetPrivileges%"
ECHO args = "ELEV " >> "%vbsGetPrivileges%"
ECHO For Each strArg in WScript.Arguments >> "%vbsGetPrivileges%"
ECHO args = args ^& strArg ^& " "  >> "%vbsGetPrivileges%"
ECHO Next >> "%vbsGetPrivileges%"
ECHO UAC.ShellExecute "!batchPath!", args, "", "runas", 1 >> "%vbsGetPrivileges%"
"%SystemRoot%\System32\WScript.exe" "%vbsGetPrivileges%" %*
exit /B

:gotPrivileges
setlocal & pushd .
cd /d %~dp0
if '%1'=='ELEV' (del "%vbsGetPrivileges%" 1>nul 2>nul  &  shift /1)

::::::::::::::::::::::::::::
::START
::::::::::::::::::::::::::::
REM Run shell as admin (example) - put here code as you like
ECHO %batchName% Arguments: %1 %2 %3 %4 %5 %6 %7 %8 %9
ECHO ------------------------------分割线------------------------------
ECHO ------------------------------上面是提权------------------------------
ECHO ------------------------------下面才是程序------------------------------

@echo off

set faceName=LAN

echo 清除ipv6地址
powershell "Remove-NetIPAddress -InterfaceAlias '%faceName%' -AddressFamily ipv6 -Confirm:$false"


echo 开关ipv6路由发现
netsh interface ipv6 set interface "%faceName%" routerdiscovery=disabled
netsh interface ipv6 set interface "%faceName%" routerdiscovery=enabled
ipconfig /flushdns


echo 重启ipv6协议
powershell Disable-NetAdapterBinding -Name '%faceName%' -ComponentID 'ms_tcpip6'
powershell Enable-NetAdapterBinding -Name '%faceName%' -ComponentID 'ms_tcpip6'


pathping -p 5000 -q 1 localhost >nul

set logaddress="C:\Users\Administrator\Desktop\ipv6.log"
del /s /q %logaddress%
echo %date% %time% >> %logaddress%
echo. >> %logaddress%
curl -s 6.ipw.cn >> %logaddress%
echo. >> %logaddress%
ping 6.ipw.cn >> %logaddress%
echo. >> %logaddress%

exit
pause



echo 重启接口
powershell Restart-NetAdapter '以太网'
ipconfig /flushdns


echo 禁用ipv6上的dhcp 只使用无状态获取IP
echo 按索引号
Get-NetIPInterface
Set-NetIPInterface -InterfaceIndex 10 -addressFamily IPv6 -dhcp Disabled
echo 按接口名称
Set-NetIPInterface -InterfaceAlias '以太网' -addressFamily IPv6 -dhcp Enabled
Set-NetIPInterface -InterfaceAlias '以太网' -addressFamily IPv6 -dhcp Disabled



echo 查看v6设置
powershell get-netipv6protocol
echo 使用临时地址
powershell Set-NetIPv6Protocol -UseTemporaryAddresses Enabled
echo 随机标识符
powershell Set-NetIPv6Protocol -RandomizeIdentifiers Enabled
echo 使用临时地址
Set-NetIPv6Protocol -UseTemporaryAddresses Enabled
echo 随机标识符
Set-NetIPv6Protocol -RandomizeIdentifiers Enabled
echo 禁用ipv6隐私模式
netsh interface ipv6 set privacy state=enable
netsh interface ipv6 set privacy state=disable



echo 设置ipv4为dhcp模式
netsh interface ip set address "SSTAP 1" dhcp
netsh interface ip set dns "SSTAP 1" dhcp


echo 断开时删除v6地址
PostDown = "powershell Remove-NetIPAddress -InterfaceAlias 'SSTAP 1' -AddressFamily ipv6 -Confirm:$false"
https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netipaddress?view=windowsserver2022-ps


https://adamtheautomator.com/disable-ipv6/


















