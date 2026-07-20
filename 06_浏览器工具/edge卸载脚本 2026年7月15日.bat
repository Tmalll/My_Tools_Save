@echo off
title Microsoft Edge 组件卸载工具
cd /d "%~dp0"

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo 正在初始化：强行关闭 Edge 相关所有背景进程...
taskkill /f /t /im msedge.exe /im msedgewebview2.exe /im MicrosoftEdgeUpdate.exe
powershell -Command "Stop-Process -Name '*MicrosoftEdgeUpdate*' -Force -ErrorAction SilentlyContinue"
explorer.exe "C:\Program Files (x86)\Microsoft"
explorer.exe "%LOCALAPPDATA%\Microsoft\Edge"

:: 获取时间戳
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH.mm.ss"') do set "timestamp=%%i"

:MENU
cls
echo ======================================================
echo           Microsoft Edge 组件一键清理工具
echo ======================================================
echo  [1] 卸载删除 \Edge (主浏览器)
echo  [2] 卸载删除 \EdgeCore (核心组件)
echo  [3] 卸载删除 \EdgeWebView (网页视图控件 - 慎删)
echo  [4] 卸载删除 \EdgeUpdate (自动更新服务)
echo  [5] 备份用户数据与清理卸载残留 (注册表/AppData/Temp)
echo.
echo  [0] 退出脚本
echo ======================================================
set /p choice=请输入选项数字并回车: 
if "%choice%"=="1" goto EDGE &
if "%choice%"=="2" goto CORE &
if "%choice%"=="3" goto WEBVIEW &
if "%choice%"=="4" goto UPDATE &
if "%choice%"=="5" goto RESIDUE &
if "%choice%"=="0" exit &
goto MENU

:EDGE
echo. && echo [正在卸载 Edge 主浏览器...]
powershell -Command "Get-ChildItem -Path 'C:\Program Files (x86)\Microsoft\Edge\Application\*\Installer' -Filter 'setup.exe' -ErrorAction SilentlyContinue | ForEach-Object { Start-Process $_.FullName -ArgumentList '--uninstall --system-level --force-uninstall' -Wait -NoNewWindow }; Remove-Item -Path 'C:\Program Files (x86)\Microsoft\Edge' -Recurse -Force -ErrorAction SilentlyContinue"
echo 执行完毕。 && pause && goto MENU

:CORE
echo. && echo [正在卸载 EdgeCore...]
powershell -Command "Get-ChildItem -Path 'C:\Program Files (x86)\Microsoft\EdgeCore\Application\*\Installer' -Filter 'setup.exe' -ErrorAction SilentlyContinue | ForEach-Object { Start-Process $_.FullName -ArgumentList '--uninstall --system-level --force-uninstall' -Wait -NoNewWindow }; Remove-Item -Path 'C:\Program Files (x86)\Microsoft\EdgeCore' -Recurse -Force -ErrorAction SilentlyContinue"
echo 执行完毕。 && pause && goto MENU

:WEBVIEW
echo. && echo [正在卸载 EdgeWebView...]
echo 提示：部分本地软件（如 QQ、钉钉、某些游戏启动器）依赖 WebView2 渲染界面，删除可能导致其白屏。
pause
powershell -Command "Get-ChildItem -Path 'C:\Program Files (x86)\Microsoft\EdgeWebView\Application\*\Installer' -Filter 'setup.exe' -ErrorAction SilentlyContinue | ForEach-Object { Start-Process $_.FullName -ArgumentList '--uninstall --msedgewebview --system-level --force-uninstall' -Wait -NoNewWindow }; Remove-Item -Path 'C:\Program Files (x86)\Microsoft\EdgeWebView' -Recurse -Force -ErrorAction SilentlyContinue"
echo 执行完毕。 && pause && goto MENU

:UPDATE
echo. && echo [正在清理 EdgeUpdate 服务与目录...]
powershell -Command "Stop-Service -Name 'edgeupdate', 'edgeupdatem' -ErrorAction SilentlyContinue; sc.exe delete edgeupdate; sc.exe delete edgeupdatem; Remove-Item -Path 'C:\Program Files (x86)\Microsoft\EdgeUpdate' -Recurse -Force -ErrorAction SilentlyContinue"
echo 执行完毕。 && pause && goto MENU

:RESIDUE
echo. && echo [正在清理用户数据、Temp缓存及注册表残留...]
reg delete "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Microsoft Edge" /f
reg delete "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Microsoft Edge Update" /f
reg delete "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Microsoft EdgeWebView" /f
if exist "C:\Program Files (x86)\Microsoft\Temp" rd /s /q "C:\Program Files (x86)\Microsoft\Temp"
del /q "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Microsoft Edge.lnk"

:: 备份用户配置文件到脚本所在目录
mkdir "%~dp0EdgeUserDataBackup" 2>nul
move "%LOCALAPPDATA%\Microsoft\Edge" "%~dp0Edge_User_Data_Backup_%timestamp%\"



echo 执行完毕。 && pause && goto MENU


exit





