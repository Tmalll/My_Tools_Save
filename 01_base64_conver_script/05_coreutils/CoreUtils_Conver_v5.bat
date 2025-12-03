@echo off
setlocal enabledelayedexpansion

:: 用户设置
:: SplitBlock=0 则关闭分割功能. 执行脚本1
:: SplitBlock=1+ 则开启分割分块功能. 执行脚本2, 并且将其设置为分割大小. (单位MB)
set SplitBlock=100

:: 检查是否有拖放文件
if "%~1"=="" (
    echo 请把文件拖放到此脚本上
    pause
    exit /b
)

:: ================= 记录开始时间 毫秒级 =================
for /f %%T in ('powershell -NoProfile -Command "[int64](Get-Date).ToUniversalTime().Ticks/10000"') do set startTime=%%T

:: 是否分块选择器.
if %SplitBlock%==0 (
    goto no_Split
) else (
    goto Split_Mode
)

:done
:: ================== 记录结束时间 毫秒级 ==================
powershell -NoProfile -Command "$elapsed=[int64](Get-Date).ToUniversalTime().Ticks/10000 - %startTime%; Write-Host ('总计耗时 {0:F3} 秒' -f ($elapsed/1000.0))"
echo. && echo 所有文件处理完成! && echo.
pause
exit /b


:no_Split
:: 遍历所有拖放文件
for %%F in (%*) do (
    set "ext=%%~xF"
    if /i "!ext!"==".b64" (
        echo 解码中: "%%F"
        coreutils.exe base64 -d "%%~fF" > "%%~dpnF"
        echo 解码完成: "%%~dpnF"
    ) else (
        echo 编码中: "%%~dpnF"
        set "outfile=%%~dpnxF.b64"
        coreutils.exe base64 -w 0 "%%~fF" > "!outfile!"
        echo 编码完成: "!outfile!"
    )
)
goto done


:Split_Mode
:: 分块模式：遍历所有拖放文件
for %%F in (%*) do (
    set "ext=%%~xF"
    if /i "!ext!"==".b64" (
        echo 解码中: "%%F"
        coreutils.exe base64 -d "%%~fF" > "%%~dpnF"
        echo 解码完成: "%%~dpnF"
    ) else (
        echo 分块编码中: "%%~dpnF"
        set /a i=1
        call :split_loop "%%~fF" "%%~dpnF"
    )
)
goto done


:split_loop
:: 子程序：按 SplitBlock(MB) 分块并逐块 base64
set "src=%~1"
set "base=%~2"
set "num=00!i!"
set "num=!num:~-3!"
set "fname=!base!.part!num!"
set /a skip=!i!-1

coreutils.exe dd if="!src!" bs=%SplitBlock%M count=1 skip=!skip! 2>nul | coreutils.exe base64 -w 0 > "!fname!.b64"

for %%A in ("!fname!.b64") do (
    if %%~zA==0 (
        del /q "%%A"
        set /a total=i-1
        echo 完成。共生成：!total! 块。
        goto :eof
    )
)

echo 生成 !fname!.b64
set /a i+=1
goto split_loop
