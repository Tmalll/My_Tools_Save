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
cls

echo 指定挂载名称
set MountName=note12-webdav-http
echo 挂载名称为: %MountName%
echo.

echo 指定服务名称
set ServerName=Rclone_Mount__ %MountName%
echo 服务名称为: %ServerName%
echo.

echo 指定程序架构 x86 or x64
set 架构=x64
echo 程序架构为: %架构%
echo.

echo 结服务并卸载
sc stop "%ServerName%" && pathping -p 500 -q 1 localhost >nul
taskkill /f /t /im rclone.exe && pathping -p 500 -q 1 localhost >nul
"%~dp0\nssm_%架构%.exe" remove "%ServerName%" confirm && pathping -p 500 -q 1 localhost >nul
echo 服务已卸载
echo.

echo 删除日志和缓存
del /s /q %MountName%.log
rmdir /s /q %MountName%_cache
echo.
pathping -p 500 -q 1 localhost >nul


rem echo 连接配置文件
rem del /s /q "C:\Windows\system32\config\systemprofile\AppData\Roaming\rclone\rclone.conf"
rem mklink "C:\Windows\system32\config\systemprofile\AppData\Roaming\rclone\rclone.conf" ^
rem    "C:\Users\Administrator\AppData\Roaming\rclone\rclone.conf"
rem echo.
rem pathping -p 500 -q 1 localhost >nul


echo 安装服务
"%~dp0\nssm_%架构%.exe" install "%ServerName%" "%~dp0note12-webdav-http.bat"
pathping -p 500 -q 1 localhost >nul

echo 设置描述
"%~dp0\nssm_%架构%.exe" set "%ServerName%" Description "%ServerName%"
pathping -p 500 -q 1 localhost >nul

sc start "%ServerName%"
echo %ServerName% 已启动

sc config "%ServerName%" start= auto
echo %ServerName% 已设置为自动启动


sc failure "%ServerName%" reset= 0 actions= restart/60000/restart/180000/restart/300000
echo %ServerName% 已设置恢复程序





exit




















echo 删除防火墙规则
netsh advfirewall firewall delete rule name="%ServerName%"

echo 创建防火墙规则
netsh advfirewall firewall add rule name="%ServerName%"	dir=in action=allow protocol=tcp  localport=53    program="%~dp0%ServerName%"
netsh advfirewall firewall add rule name="%ServerName%"	dir=in action=allow protocol=udp  localport=53    program="%~dp0%ServerName%"
netsh advfirewall firewall add rule name="%ServerName%"	dir=in action=allow protocol=tcp  localport=5353  program="%~dp0%ServerName%"
netsh advfirewall firewall add rule name="%ServerName%"	dir=in action=allow protocol=udp  localport=5353  program="%~dp0%ServerName%"
netsh advfirewall firewall add rule name="%ServerName%"	dir=in action=allow protocol=tcp  localport=5443  program="%~dp0%ServerName%"
netsh advfirewall firewall add rule name="%ServerName%"	dir=in action=allow protocol=udp  localport=5443  program="%~dp0%ServerName%"



