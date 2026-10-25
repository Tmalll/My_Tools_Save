@echo off
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



powercfg /SETACVALUEINDEX SCHEME_CURRENT SUB_SLEEP RTCWAKE 0
powercfg /SETDCVALUEINDEX SCHEME_CURRENT SUB_SLEEP RTCWAKE 0
powercfg /S SCHEME_CURRENT

reg add "HKLM\SOFTWARE\Policies\Microsoft\Power\PowerSettings\BD3B718A-0680-4D9D-8AB2-E1D2B4AC806D" /v ACSettingIndex /t REG_DWORD /d 0 /f

powercfg /Query SCHEME_CURRENT SUB_SLEEP RTCWAKE

echo 在输出结果的末尾，你会看到：

echo 正向交流电源设置索引: 0x00000000 (代表已禁用)

echo 直流电源设置索引: 0x00000000 (代表已禁用)


pause
exit
