@echo off
setlocal enabledelayedexpansion

:: ==========================================================
:: 参数设置
:: MODE: 1 = 普通模式(不加密文件名, 输出.b64), 2 = 加密文件名模式(输出.efb64)
set "MODE=1"
:: WRAP_SETTING: 0 为不换行(单行)，76 为标准换行
set "WRAP_SETTING=0"
:: ==========================================================

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
coreutils base64 -w %WRAP_SETTING% "!input!">"!target!"
goto :NEXT_FILE

:ENCODE_ENCRYPTED
:: --- 加密文件名编码 (MODE=2) ---
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "$b=[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes('!filename!')); $b.Replace('+','-').Replace('/','_').Replace('=','@')"`) do set "enc_name=%%a"
set "target=!enc_name!.efb64"
echo [加密编码] "!filename!" --^> "!target!"
coreutils base64 -w %WRAP_SETTING% "!input!">"!target!"
goto :NEXT_FILE

:DECODE_PLAIN
:: --- 普通解码 (针对 .b64) ---
set "dec_name_plain=%~n1"
echo [解码] "!filename!" --^> "!dec_name_plain!"
coreutils base64 -d "!input!">"!dec_name_plain!"
goto :NEXT_FILE

:DECODE_ENCRYPTED
:: --- 文件名还原解码 (针对 .efb64) ---
set "name_part=%~n1"
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "$n='!name_part!'.Replace('-','+').Replace('_','/').Replace('@','='); [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($n))"`) do set "dec_name=%%a"
echo [还原解码] "!filename!" --^> "!dec_name!"
coreutils base64 -d "!input!">"!dec_name!"
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