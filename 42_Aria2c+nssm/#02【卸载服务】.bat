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


echo 结束并暂停服务
sc stop "%ServerName%" && pathping -p 100 -q 1 localhost >nul
taskkill /im %ServerName% && pathping -p 100 -q 1 localhost >nul


echo 卸载服务
"%~dp0\nssm_x%sys8664%.exe" remove "%ServerName%" confirm
pathping -p 100 -q 1 localhost >nul


echo 删除防火墙规则
netsh advfirewall firewall delete rule name="%ServerName%"
pathping -p 100 -q 1 localhost >nul


echo 删除连接目录
rmdir /s /q "C:\Aria2c_2024"
pathping -p 100 -q 1 localhost >nul



exit





