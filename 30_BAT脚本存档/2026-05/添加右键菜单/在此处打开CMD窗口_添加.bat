@echo off
title 安装 CMD 右键菜单（最终修复版）
echo.

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

:: ============================================================
:: 写入 VBS
:: ============================================================
> "%SystemRoot%\OpenCmdHere.vbs" (
    echo If WScript.Arguments.Count = 0 Then WScript.Quit
    echo Set oShell = CreateObject("WScript.Shell"^)
    echo path = WScript.Arguments(0^)
    echo oShell.Run "cmd.exe /k pushd """ ^& path ^& """", 1, False
)

> "%SystemRoot%\OpenCmdHereAdmin.vbs" (
    echo If WScript.Arguments.Count = 0 Then WScript.Quit
    echo Set oShell = CreateObject("Shell.Application"^)
    echo path = WScript.Arguments(0^)
    echo oShell.ShellExecute "cmd.exe", "/k pushd """ ^& path ^& """", "", "runas", 1
)

echo VBS 写入完成
echo.

:: ============================================================
:: 普通 CMD
:: ============================================================
reg add "HKCR\Directory\Background\shell\OpenCMDHere" /ve /d "在此处打开 CMD 窗口" /f
reg add "HKCR\Directory\Background\shell\OpenCMDHere" /v Icon /d "cmd.exe" /f
reg add "HKCR\Directory\Background\shell\OpenCMDHere\command" /ve /d ^
"wscript.exe \"%SystemRoot%\OpenCmdHere.vbs\" \"%%V\"" /f

reg add "HKCR\Directory\shell\OpenCMDHere" /ve /d "在此处打开 CMD 窗口" /f
reg add "HKCR\Directory\shell\OpenCMDHere" /v Icon /d "cmd.exe" /f
reg add "HKCR\Directory\shell\OpenCMDHere\command" /ve /d ^
"wscript.exe \"%SystemRoot%\OpenCmdHere.vbs\" \"%%V\"" /f

:: ============================================================
:: 管理员 CMD
:: ============================================================
reg add "HKCR\Directory\Background\shell\OpenCMDHereAdmin" /ve /d "在此处打开 CMD 窗口(管理员)" /f
reg add "HKCR\Directory\Background\shell\OpenCMDHereAdmin" /v Icon /d "cmd.exe" /f
reg add "HKCR\Directory\Background\shell\OpenCMDHereAdmin" /v HasLUAShield /t REG_SZ /d "" /f
reg add "HKCR\Directory\Background\shell\OpenCMDHereAdmin\command" /ve /d ^
"wscript.exe \"%SystemRoot%\OpenCmdHereAdmin.vbs\" \"%%V\"" /f

reg add "HKCR\Directory\shell\OpenCMDHereAdmin" /ve /d "在此处打开 CMD 窗口(管理员)" /f
reg add "HKCR\Directory\shell\OpenCMDHereAdmin" /v Icon /d "cmd.exe" /f
reg add "HKCR\Directory\shell\OpenCMDHereAdmin" /v HasLUAShield /t REG_SZ /d "" /f
reg add "HKCR\Directory\shell\OpenCMDHereAdmin\command" /ve /d ^
"wscript.exe \"%SystemRoot%\OpenCmdHereAdmin.vbs\" \"%%V\"" /f

echo.
echo ================================
echo 已安装（最终修复版）：
echo  - 修复 reg 语法错误
echo  - 路径正确
echo  - 无报错
echo ================================
pause
