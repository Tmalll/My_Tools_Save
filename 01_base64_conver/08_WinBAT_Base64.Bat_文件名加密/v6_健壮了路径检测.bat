@echo off
setlocal enabledelayedexpansion

:: ==========================================================
:: 参数设置
:: MODE: 1 = 普通模式(不加密文件名, 输出.b64), 2 = 加密文件名模式(输出.efb64)
set "MODE=1"
:: WRAP_SETTING: 0 为不换行(单行)，76 为标准换行
set "WRAP_SETTING=0"
:: ==========================================================

:: ================================
:: 检查 coreutils 环境（PowerShell 版本）
:: ================================
set "BASE64_CMD="
set "COREUTILS_PATH="

for /f "delims=" %%i in ('powershell -NoProfile -Command ^
    "$ErrorActionPreference='SilentlyContinue';" ^
    "$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path;" ^
    "$pathDirs = $env:PATH -split ';' | Where-Object { $_ -and ($_ -ne $scriptDir) };" ^
    "$found = $pathDirs | ForEach-Object { $c = Join-Path $_ 'coreutils.exe'; if(Test-Path $c){ return $c } } | Select-Object -First 1;" ^
    "if($found){ Write-Output $found }"') do (
    set "COREUTILS_PATH=%%i"
)

if defined COREUTILS_PATH (
    echo 当前 coreutils 路径为:
    echo %COREUTILS_PATH%
    set "BASE64_CMD=%COREUTILS_PATH% base64"
    echo 当前执行命令为: !BASE64_CMD!
    echo [系统Path模式]
    echo.
) else (
    if exist "%~dp0coreutils.exe" (
        echo 当前 coreutils 路径为:
        echo %~dp0coreutils.exe
        set "BASE64_CMD=%~dp0coreutils.exe base64"
        echo 当前执行命令为: !BASE64_CMD!
        echo [当前目录模式]
        echo.
    ) else (
        echo [错误] 未找到 coreutils 命令
        echo Win10/11可使用 [ winget install uutils.coreutils ] 命令进行安装. [ 可能需要代理 ]
        echo 具体可参见: [ https://uutils.github.io/coreutils/docs/installation.html#windows ]
        echo 或者下载 coreutils.exe 的二进制文件放置在脚本同目录下：
        echo 项目地址: [ https://github.com/uutils/coreutils/releases/latest ]
        echo.
        pause
        exit /b
    )
)


:: ============================
:: 继续执行后续脚本...
:: ============================


:: 检查是否拖入了文件
if "%~1"=="" (
    echo [提示] 请将文件拖放到此脚本上进行处理。
    pause
    exit /b
)



:loop
if "%~1" == "" goto end
set "input=%~1"
set "filename=%~nx1"
set "extension=%~x1"

:: --- 自动解码路由 (优先级最高) ---
if /i "!extension!"==".b64" goto :DECODE_PLAIN
if /i "!extension!"==".efb64" goto :DECODE_ENCRYPTED

:: --- 编码路由 (根据 MODE 变量) ---
if "!MODE!"=="1" goto :ENCODE_PLAIN
if "!MODE!"=="2" goto :ENCODE_ENCRYPTED

:ENCODE_PLAIN
:: --- 普通编码 (MODE=1) ---
set "target=!filename!.b64"
echo [编码] "!filename!" --^> "!target!"
%BASE64_CMD% -w %WRAP_SETTING% "!input!">"!target!"
goto :NEXT_FILE

:ENCODE_ENCRYPTED
:: --- 加密文件名编码 (MODE=2) ---
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "$b=[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes('!filename!')); $b.Replace('+','-').Replace('/','_').Replace('=','@')"`) do set "enc_name=%%a"
set "target=!enc_name!.efb64"
echo [加密编码] "!filename!" --^> "!target!"
%BASE64_CMD% -w %WRAP_SETTING% "!input!">"!target!"
goto :NEXT_FILE

:DECODE_PLAIN
:: --- 普通解码 (针对 .b64) ---
set "dec_name_plain=%~n1"
echo [解码] "!filename!" --^> "!dec_name_plain!"
%BASE64_CMD% -d "!input!">"!dec_name_plain!"
goto :NEXT_FILE

:DECODE_ENCRYPTED
:: --- 文件名还原解码 (针对 .efb64) ---
set "name_part=%~n1"
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "$n='!name_part!'.Replace('-','+').Replace('_','/').Replace('@','='); [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($n))"`) do set "dec_name=%%a"
echo [还原解码] "!filename!" --^> "!dec_name!"
%BASE64_CMD% -d "!input!">"!dec_name!"
goto :NEXT_FILE

:NEXT_FILE
shift
goto loop

:end
echo.
echo ==========================================================
echo [完成] 所有文件处理完毕。 (当前工作模式: MODE=!MODE!)
echo ==========================================================
pause
exit /b