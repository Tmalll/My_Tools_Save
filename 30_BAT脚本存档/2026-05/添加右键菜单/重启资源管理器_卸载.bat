@echo off
title 卸载 重启资源管理器 菜单

net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

reg delete "HKCR\Directory\Background\shell\RestartExplorer" /f >nul 2>&1

del /f /q "%SystemRoot%\RestartExplorer.vbs" >nul 2>&1

echo 已卸载
pause
