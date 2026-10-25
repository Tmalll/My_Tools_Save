@echo off

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: ===== 路径 =====
set "MP=%ProgramFiles%\Windows Defender\MpCmdRun.exe"
set "ICON=%ProgramFiles%\Windows Defender\EppManifest.dll"

:main_menu
echo.
echo ==========================================
echo   WDF 右键菜单管理
echo ==========================================
echo.
echo [1] 安装右键菜单
echo [2] 卸载右键菜单
echo.
set /p CHOICE=请输入选项: 

if "%CHOICE%"=="1" goto install
if "%CHOICE%"=="2" goto uninstall

echo.
echo 输入无效
timeout /t 1 > NUL
cls
goto :main_menu

:: =========================================================
:: 安装
:: =========================================================
:install

if not exist "%MP%" (
    echo.
    echo 未找到:
    echo %MP%
    pause
    exit /b
)

echo.
echo 正在安装右键菜单...
echo.

:: ===== 文件 =====
reg add "HKCR\*\shell\WDFScan" /v "MUIVerb" /d "使用 WDF 扫描当前文件" /f >nul
reg add "HKCR\*\shell\WDFScan" /v "Icon" /d "%ICON%" /f >nul
reg add "HKCR\*\shell\WDFScan\command" /ve /d "cmd.exe /k \"\"%MP%\" -Scan -ScanType 3 -DisableRemediation -File \"%%1\"\"" /f >nul

:: ===== 文件夹 =====
reg add "HKCR\Directory\shell\WDFScan" /v "MUIVerb" /d "使用 WDF 扫描当前文件夹" /f >nul
reg add "HKCR\Directory\shell\WDFScan" /v "Icon" /d "%ICON%" /f >nul
reg add "HKCR\Directory\shell\WDFScan\command" /ve /d "cmd.exe /k \"\"%MP%\" -Scan -ScanType 3 -DisableRemediation -File \"%%1\"\"" /f >nul

echo 已安装完成
echo.
pause
exit /b

:: =========================================================
:: 卸载
:: =========================================================
:uninstall

echo.
echo 正在卸载右键菜单...
echo.

reg delete "HKCR\*\shell\WDFScan" /f >nul 2>&1
reg delete "HKCR\Directory\shell\WDFScan" /f >nul 2>&1

echo 已卸载完成
echo.
pause
exit /b