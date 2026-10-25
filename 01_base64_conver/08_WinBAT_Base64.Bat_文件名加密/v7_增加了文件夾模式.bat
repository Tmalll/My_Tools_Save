@echo off
setlocal enabledelayedexpansion

:: ==========================================================
:: 參數預設
:: ==========================================================
:: WRAP_SETTING: 0 为不换行(单行)，76 为标准换行
set "WRAP_SETTING=0"
set "BASE64_CMD="

:: 環境檢查
for /f "delims=" %%i in ('powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue'; $pDirs=$env:PATH.Split(';',[System.StringSplitOptions]::RemoveEmptyEntries); $pDirs | ForEach-Object { $c=Join-Path $_ 'coreutils.exe'; if(Test-Path $c){ $c; break } } | Select-Object -First 1"') do set "COREUTILS_PATH=%%i"

if not defined COREUTILS_PATH (
    if exist "%~dp0coreutils.exe" (
        set "BASE64_CMD=%~dp0coreutils.exe base64"
    ) else (
        echo [錯誤] 未找到 coreutils.exe
        pause & exit /b
    )
) else (
    set "BASE64_CMD=%COREUTILS_PATH% base64"
)

:: ==========================================================
:: 交互輸入模式
:: ==========================================================
if "%~1" == "" (
    echo [提示] 請將文件或文件夾拖放到此腳本上。
    pause & exit /b
)

echo ==========================================================
echo [模式選擇]
echo 1. 直接按 [Enter]          : 普通模式 (MODE 1)
echo 2. 輸入 [EF] 後按 Enter    : 加密文件名模式 (MODE 2)
echo 3. 輸入 [Q]  後按 Enter    : 退出
echo ==========================================================
set "USER_INPUT="
set /p "USER_INPUT=請輸入指令並回車: "

if /i "!USER_INPUT!"=="Q" exit /b
if /i "!USER_INPUT!"=="EF" (
    set "MODE=2"
    set "MODE_NAME=加密文件名模式 (MODE 2)"
) else (
    set "MODE=1"
    set "MODE_NAME=普通模式 (MODE 1)"
)

echo.
echo ----------------------------------------------------------
echo 準備執行: !MODE_NAME!
echo ----------------------------------------------------------

echo 请确认,  是否执行 !MODE_NAME! 操作文件? 3
pause
echo 请确认,  是否执行 !MODE_NAME! 操作文件? 2
pause
echo 请确认,  是否执行 !MODE_NAME! 操作文件? 1
pause



:: ==========================================================
:: 遍歷處理邏輯
:: ==========================================================
:input_loop
if "%~1"=="" goto end
set "input_target=%~1"

:: 判斷是文件還是文件夾
if exist "!input_target!\*" (
    set "source_dir=!input_target!"
    :: 移除路徑結尾可能存在的斜槓，統一格式
    if "!source_dir:~-1!"=="\" set "source_dir=!source_dir:~0,-1!"
    set "output_dir=!source_dir!\output"
    echo [目錄] 開始處理: "!source_dir!"
    
    for /f "delims=" %%F in ('dir /b /s /a-d "!source_dir!"') do (
        set "full_path=%%F"
        :: 排除包含 \output\ 的路徑
        echo !full_path! | findstr /i "\\output\\" >nul
        if errorlevel 1 (
            call :process_core "%%F" "!output_dir!"
        )
    )
) else (
    for %%A in ("!input_target!") do set "p_dir=%%~dpA"
    set "p_dir=!p_dir:~0,-1!"
    call :process_core "!input_target!" "!p_dir!\output"
)

shift
goto :input_loop

:: ==========================================================
:: 核心處理子程序
:: ==========================================================
:process_core
set "f_in=%~1"
set "d_out=%~2"
set "fname=%~nx1"
set "fext=%~x1"

if not exist "!d_out!" mkdir "!d_out!"

:: A. 解碼路由 (針對 .b64 / .efb64)
if /i "!fext!"==".b64" (
    echo [解碼] "!fname!"
    %BASE64_CMD% -d "!f_in!" > "!d_out!\%~n1"
    goto :eof
)
if /i "!fext!"==".efb64" (
    for /f "usebackq delims=" %%a in (`powershell -NoProfile -Command "$n='%~n1'.Replace('-','+').Replace('_','/').Replace('@','='); [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($n))"`) do set "d_name=%%a"
    echo [還原] "!d_name!"
    %BASE64_CMD% -d "!f_in!" > "!d_out!\!d_name!"
    goto :eof
)

:: B. 編碼路由 (根據當前選擇的 MODE)
if "!MODE!"=="1" (
    echo [編碼] "!fname!"
    %BASE64_CMD% -w %WRAP_SETTING% "!f_in!" > "!d_out!\!fname!.b64"
) else (
    for /f "usebackq delims=" %%a in (`powershell -NoProfile -Command "$b=[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes('%~nx1')); $b.Replace('+','-').Replace('/','_').Replace('=','@')"`) do set "e_name=%%a"
    echo [加密] "!fname!" --^> "!e_name!.efb64"
    %BASE64_CMD% -w %WRAP_SETTING% "!f_in!" > "!d_out!\!e_name!.efb64"
)
goto :eof

:end
echo.
echo ==========================================================
echo [完成] 所有任務處理完畢。 (模式: !MODE_NAME!)
echo ==========================================================
pause
exit /b