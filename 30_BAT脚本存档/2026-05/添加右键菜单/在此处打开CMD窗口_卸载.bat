@echo off
title 卸载 CMD 右键菜单
echo.

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

echo 正在删除右键菜单...

:: ============================================================
:: 删除 普通 CMD
:: ============================================================
reg delete "HKCR\Directory\Background\shell\OpenCMDHere" /f >nul 2>&1
reg delete "HKCR\Directory\shell\OpenCMDHere" /f >nul 2>&1

:: ============================================================
:: 删除 管理员 CMD
:: ============================================================
reg delete "HKCR\Directory\Background\shell\OpenCMDHereAdmin" /f >nul 2>&1
reg delete "HKCR\Directory\shell\OpenCMDHereAdmin" /f >nul 2>&1

:: ============================================================
:: 删除 VBS 文件
:: ============================================================
if exist "%SystemRoot%\OpenCmdHere.vbs" (
    del /f /q "%SystemRoot%\OpenCmdHere.vbs"
)

if exist "%SystemRoot%\OpenCmdHereAdmin.vbs" (
    del /f /q "%SystemRoot%\OpenCmdHereAdmin.vbs"
)

echo.
echo ================================
echo 已卸载完成：
echo  - 右键菜单已删除
echo  - VBS 文件已清理
echo ================================
pause
