@echo on
setlocal enabledelayedexpansion

:: ==========================================================
:: 参数设置
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

:: 路由分流：如果是 .efb64 就跳到解码，否则执行编码
if /i "!extension!"==".efb64" goto :DECODE_PROC

:ENCODE_PROC
:: --- 加密编码逻辑 ---
:: 处理文件名：将 555.test.xyz 整体编码
:: 对base64中的特殊符号 + / = 进行安全替换, 使其符合 URL安全, CMD安全, Windows文件名安全.
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "$b=[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes('!filename!')); $b.Replace('+','-').Replace('/','_').Replace('=','@')"`) do set "enc_name=%%a"

:: 处理文件内容内容
coreutils base64 -w %WRAP_SETTING% "!input!" > "!enc_name!.efb64"
goto :NEXT_FILE

:DECODE_PROC
:: --- 解码逻辑 ---
:: 处理文件名：还原被加密的文件名
set "name_part=%~n1"
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "$n='!name_part!'.Replace('-','+').Replace('_','/').Replace('@','='); [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($n))"`) do set "dec_name=%%a"

:: 处理文件内容
coreutils base64 -d "!input!" > "!dec_name!"

:NEXT_FILE
shift
goto loop

:end
echo.
echo [完成] 所有文件处理完毕。
pause
exit /b