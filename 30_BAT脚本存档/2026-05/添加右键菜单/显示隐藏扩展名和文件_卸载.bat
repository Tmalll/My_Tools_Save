@echo off
title 卸载 文件显示切换 右键菜单
echo.

:: ===== 提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

echo 正在删除右键菜单...

:: ============================================================
:: 删除注册表项
:: ============================================================
reg delete "HKCR\Directory\Background\shell\ToggleExt" /f >nul 2>&1
reg delete "HKCR\Directory\Background\shell\ToggleHidden" /f >nul 2>&1

:: ============================================================
:: 删除 VBS 文件
:: ============================================================
if exist "%SystemRoot%\HideExtendName.vbs" (
    del /f /q "%SystemRoot%\HideExtendName.vbs"
)

if exist "%SystemRoot%\HideFile.vbs" (
    del /f /q "%SystemRoot%\HideFile.vbs"
)

echo.
echo ================================
echo 已卸载完成：
echo  - 右键菜单已删除
echo  - VBS 文件已清理
echo ================================
pause
