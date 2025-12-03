@echo off
setlocal enabledelayedexpansion

:: 检查 gh 是否存在
where gh >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 GitHub CLI
    pause
    exit /b
)

set FILES=

:: 获取脚本完整路径
set SCRIPT_FULL=%~f0

:: ------------------------
:: 拖拽模式：上传拖拽的所有文件，所有文件共用一个gist
:: ------------------------
if not "%~1"=="" (
    :loopdrag
        if "%~1"=="" goto afterfiles
        if exist "%~1" (
            set FILES=!FILES! "%~1"
        ) else (
            echo [警告] 文件不存在: %~1
        )
        shift
        goto loopdrag
)

:: ------------------------
:: 双击模式：上传 upload 文件夹内所有文件，所有文件共用一个gist
:: ------------------------
set "UPLOAD_DIR=%~dp0upload"
if exist "!UPLOAD_DIR!\" (
    for /f "delims=" %%F in ('dir /b /a-d "!UPLOAD_DIR!"') do (
        set FILES=!FILES! "!UPLOAD_DIR!\%%F"
    )
)

:afterfiles
if "!FILES!"=="" (
    echo [提示] 没有找到可上传的文件
    pause
    exit /b
)

:: 上传所有文件到一个私有 gist
gh gist create !FILES!
echo.
echo 上传完成
pause
