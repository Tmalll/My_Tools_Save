@echo on
setlocal enabledelayedexpansion

:: ==========================================================
:: 参数设置
:: WRAP_SETTING: 0 为不换行(单行)，适合文件传输和程序解析。
::               76 为标准换行(每行76个字符)，适合记事本查看。
set "WRAP_SETTING=0"
:: ==========================================================

:: 检查是否拖入了文件
if "%~1"=="" (
    echo [提示] 请将文件拖放到此脚本上进行处理。
    timeout /t 3 >nul
    exit /b
)

:loop
if "%~1" == "" goto end
set "input=%~1"
set "filename=%~nx1"
set "extension=%~x1"

:: 检查模式：如果是 .efb64 则解码，否则编码
if /i "!extension!"==".efb64" (
    
    :: --- 解码逻辑 ---
    set "name_part=%~n1"
    
    :: 修复后的 FOR 循环语法：使用单引号包裹 PowerShell 命令
    :: 修正了对 !name_part! 的引用方式
    for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "$n = '!name_part!'.Replace('-', '+').Replace('_', '/').Replace('@', '='); [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($n))"`) do (
        set "dec_name=%%a"
    )
    
    :: 使用 coreutils 解码
    coreutils base64 -d "!input!" > "!dec_name!"

) else (

    :: --- 编码逻辑 (-ef) ---
    :: 修复后的 FOR 循环语法
    for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "$b = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes('!filename!')); $b.Replace('+', '-').Replace('/', '_').Replace('=', '@')"`) do (
        set "enc_name=%%a"
    )
    
    :: 使用 coreutils 编码
    coreutils base64 -w %WRAP_SETTING% "!input!" > "!enc_name!.efb64"
)

shift
goto loop

:end
pause
exit /b