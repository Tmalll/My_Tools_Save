@echo off
setlocal enabledelayedexpansion

:: ================================
:: 配置：指定 Telegram 程序名
:: ================================
set "PRname=Telegram.exe"

:: 自动获取脚本所在目录
set "TGDIR=%~dp0"
if "%TGDIR:~-1%"=="\" set "TGDIR=%TGDIR:~0,-1%"

set "TGEXE=%TGDIR%\%PRname%"

:: 检查程序是否存在
if not exist "%TGEXE%" (
    echo [错误] 未找到程序：%TGEXE%
    pause
    exit /b 1
)

echo -----------------------------------------
echo 清理旧的 tg:// 协议注册表...
echo -----------------------------------------

:: 同时清理 HKCU 下的相关项以防冲突
reg delete "HKEY_CURRENT_USER\Software\Classes\tg" /f >nul 2>&1
reg delete "HKEY_CURRENT_USER\Software\Classes\tdesktop.tg" /f >nul 2>&1

echo 完成清理
echo -----------------------------------------
echo 写入新的 tg:// 协议注册表...
echo -----------------------------------------

:: 定义注册表根路径 (建议使用 HKCU，无需管理员权限权限)
set "KEY=HKEY_CURRENT_USER\Software\Classes\tg"

:: 写入基础协议信息
reg add "%KEY%" /ve /d "URL:Telegram Link" /f >nul
reg add "%KEY%" /v "URL Protocol" /d "" /f >nul

:: 写入图标
reg add "%KEY%\DefaultIcon" /ve /d "\"%TGEXE%\",0" /f >nul

:: ================================
:: 核心修正：构造 command 字符串
:: 这里需要对内部的引号进行三重复写转义 \"\"\"
:: ================================
reg add "%KEY%\shell\open\command" /ve /d "\"%TGEXE%\" -workdir \"%TGDIR%\" \"%%1\"" /f >nul

:: 为了确保万无一失，同时关联 tdesktop.tg 别名
reg add "HKEY_CURRENT_USER\Software\Classes\tdesktop.tg" /ve /d "URL:Telegram Link" /f >nul
reg add "HKEY_CURRENT_USER\Software\Classes\tdesktop.tg" /v "URL Protocol" /d "" /f >nul
reg add "HKEY_CURRENT_USER\Software\Classes\tdesktop.tg\shell\open\command" /ve /d "\"%TGEXE%\" -workdir \"%TGDIR%\" \"%%1\"" /f >nul

echo 注册完成！
echo 注册路径: %KEY%
echo -----------------------------------------
echo 现在点击网页上的 tg:// 链接即可唤起 Telegram
echo -----------------------------------------

pause
exit /b 0