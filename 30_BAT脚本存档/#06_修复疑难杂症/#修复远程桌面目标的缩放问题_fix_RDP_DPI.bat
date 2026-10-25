@echo off

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:menu
cls
echo ======================================================
echo             远程桌面 DPI 缩放管理工具
echo ======================================================
echo.
echo  [1] 锁定 100%% 缩放 (忽略远程客户端 DPI，固定 100%% 显示)
echo  [2] 清除并还原 (删除这些设置，恢复系统默认自适应机制)
echo  [3] 退出脚本
echo.
echo ======================================================
set /p choice=请输入选项数值 [1-3]: 

if "%choice%"=="1" goto option1
if "%choice%"=="2" goto option2
if "%choice%"=="3" goto end
echo 输入错误，请重新选择！ & timeout /t 2 >nul & goto menu

:option1
echo.
echo 正在写入注册表配置...
:: 还原100%缩放
reg add "HKEY_CURRENT_USER\Control Panel\Desktop" /v "LogPixels" /t REG_DWORD /d 96 /f

:: 使用旧式全局缩放
reg add "HKEY_CURRENT_USER\Control Panel\Desktop" /v "Win8DpiScaling" /t REG_DWORD /d 1 /f

:: 忽略RDP客户端缩放
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations" /v "IgnoreClientDesktopScaleFactor" /t REG_DWORD /d 1 /f

echo.
echo.
echo [成功] 配置已写入！
echo 提示：部分设置（特别是 HKLM 项）需要重启电脑或重启 RDP 服务后才能完全生效。
echo.
echo.

pause
goto menu

:option2
echo.
echo 正在删除注册表配置并还原默认...

reg delete "HKEY_CURRENT_USER\Control Panel\Desktop" /v "LogPixels" /f
reg delete "HKEY_CURRENT_USER\Control Panel\Desktop" /v "Win8DpiScaling" /f
reg delete "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations" /v "IgnoreClientDesktopScaleFactor"

echo.
echo.
echo [成功] 注册表项已清除，已恢复系统默认状态！
echo 提示：建议重启电脑以确保完全恢复自适应。
echo.
echo.

pause
goto menu

:end
exit

