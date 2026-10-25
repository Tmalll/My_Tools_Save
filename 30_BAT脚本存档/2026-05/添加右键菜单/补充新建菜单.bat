@echo off
title Fix New Menu Names

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo 请以管理员身份运行
    pause
    exit /b
)

:: ===== TXT =====
reg add "HKCR\.txt" /ve /t REG_SZ /d "txt_auto_file" /f
reg add "HKCR\txt_auto_file" /ve /t REG_SZ /d "TXT 文件" /f

:: ===== BAT =====
reg add "HKCR\.bat" /ve /t REG_SZ /d "bat_auto_file" /f
reg add "HKCR\bat_auto_file" /ve /t REG_SZ /d "BAT 文件" /f

:: ===== MD =====
reg add "HKCR\.md" /ve /t REG_SZ /d "md_auto_file" /f
reg add "HKCR\md_auto_file" /ve /t REG_SZ /d "MD 文件" /f

:: ===== 确保 ShellNew 存在（否则不会出现在新建菜单）=====
reg add "HKCR\.txt\ShellNew" /v NullFile /f
reg add "HKCR\.bat\ShellNew" /v NullFile /f
reg add "HKCR\.md\ShellNew"  /v NullFile /f

:: ===== 刷新 =====
taskkill /f /im explorer.exe >nul 2>&1
start explorer.exe

echo 完成
pause
