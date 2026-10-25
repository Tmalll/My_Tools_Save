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


echo 指定程序名称
set ServerName=Aria2c-Local.exe
set sys8664=64

cls

echo 结束并暂停服务
sc stop "%ServerName%" && pathping -p 250 -q 1 localhost >nul
taskkill /im %ServerName% && pathping -p 250 -q 1 localhost >nul


echo 卸载服务
"%~dp0nssm_x%sys8664%.exe" remove "%ServerName%" confirm
pathping -p 250 -q 1 localhost >nul


echo 删除防火墙规则
netsh advfirewall firewall delete rule name="%ServerName%"
pathping -p 250 -q 1 localhost >nul


echo 创建防火墙规则
netsh advfirewall firewall add rule name="%ServerName%" dir=in action=allow protocol=tcp    localport=16888
netsh advfirewall firewall add rule name="%ServerName%" dir=in action=allow protocol=udp   localport=16888
netsh advfirewall firewall add rule name="%ServerName%" dir=in action=allow protocol=tcp    localport=11111
netsh advfirewall firewall add rule name="%ServerName%" dir=in action=allow protocol=udp   localport=11111
netsh advfirewall firewall add rule name="%ServerName%" dir=in action=allow protocol=tcp    localport=56800-56999
netsh advfirewall firewall add rule name="%ServerName%" dir=in action=allow protocol=udp   localport=56800-56999
pathping -p 250 -q 1 localhost >nul
cls



echo 安装服务 直接调用模式
"%~dp0nssm_x%sys8664%.exe" install "%ServerName%" "%~dp0Aria2c\Aria2c-Local.exe"
echo 设置描述
"%~dp0nssm_x%sys8664%.exe" set "%ServerName%" Description "%ServerName%"
echo 设置启动参数
"%~dp0nssm_x%sys8664%.exe" set "%ServerName%" AppParameters ^
	--conf-path="%~dp0Aria2c\aria2.conf" ^
	--input-file="%~dp0Aria2c\aria2-save.session" ^
	--save-session="%~dp0Aria2c\aria2-save.session" ^
	 --dht-file-path="%~dp0Aria2c\aria2-dht-v4.dat" ^
	 --dht-file-path6="%~dp0Aria2c\aria2-dht-v6.dat" ^
	 --log="%~dp0Aria2c\Aria2c_LOG.log"
echo 设置工作目录（可选，但建议）
"%~dp0nssm_x%sys8664%.exe" set "%ServerName%" AppDirectory "%~dp0Aria2c"


echo 启动服务
"%~dp0nssm_x%sys8664%.exe" start "%ServerName%"


sc start "%ServerName%"
pathping -p 500 -q 1 localhost >nul
echo %ServerName% 已启动


sc config "%ServerName%" start= auto
pathping -p 500 -q 1 localhost >nul
echo %ServerName% 已设置为自动启动


sc failure "%ServerName%" reset= 0 actions= restart/5000/restart/15000/restart/30000
pathping -p 500 -q 1 localhost >nul
echo %ServerName% 已设置恢复程序


exit





