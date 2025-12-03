@echo off
setlocal enabledelayedexpansion

:: 检查 gh 是否存在
where gh >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 GitHub CLI
    pause
    exit /b
)

:: ------------------------
:: 拖拽模式：上传拖拽的所有文件，每个文件单独 gist
:: ------------------------
if not "%~1"=="" (
    :loopdrag
        if "%~1"=="" goto end
        if exist "%~1" (
            gh gist create "%~1"
        ) else (
            echo [警告] 文件不存在: %~1
        )
        shift
        goto loopdrag
)

:: ------------------------
:: 双击模式：上传 upload 文件夹内所有文件，每个文件单独 gist
:: ------------------------
set "UPLOAD_DIR=%~dp0upload"
if exist "!UPLOAD_DIR!\" (
    for /f "delims=" %%F in ('dir /b /a-d "!UPLOAD_DIR!"') do (
        gh gist create "!UPLOAD_DIR!\%%F"
    )
)

:end
echo.
echo 上传完成。
pause
