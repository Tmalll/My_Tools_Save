@echo off
setlocal enabledelayedexpansion

:: 用户设置
:: SplitBlock=0 则关闭分割功能. 执行脚本1, 拖进来的文件不进行分割, 直接编码.
:: SplitBlock=1+ 则开启分割分块功能. 执行脚本2, 并且将其设置为分割大小. (单位MB)
set SplitBlock=100

:: 并行解码最大线程数, 用于开启分割后的解码流程.
set maxThreads=5

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
rd /s /q ".jobs"
:: ================== 记录结束时间 毫秒级 ==================
powershell -NoProfile -Command "$elapsed=[int64](Get-Date).ToUniversalTime().Ticks/10000 - %startTime%; Write-Host ('总计耗时 {0:F3} 秒' -f ($elapsed/1000.0))"
echo. && echo 所有文件处理完成! && echo.
pause
exit /b
:: ================== 主流程结束 ==================


:: ================== 脚本1, 单线程脚本 ==================
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

:: ================== 脚本2, 分块脚本 ==================
:Split_Mode
:: 分块模式：遍历所有拖放文件
for %%F in (%*) do (
    set "ext=%%~xF"
    if /i "!ext!"==".b64" (
        call :ScanFile
        :: 只有当 totalFiles > 0 时才需要进入解码流程
        if "!totalFiles!" GTR "0" (
                echo 检测到 Base64 文件，开始解码批处理... && echo. && echo.
                
                echo ***** ***** ***** 解码子程序开始 ***** ***** ***** && echo.
                call :decodeLoop
                echo ***** ***** ***** 解码子程序结束 ***** ***** ***** && echo. && echo.
                
                echo ***** ***** ***** 合并子程序开始 ***** ***** ***** && echo.
                call :merge_parts
                echo ***** ***** ***** 合并子程序结束 ***** ***** ***** && echo. && echo.
                
            )
            echo 解码脚本结束.... && echo.
    ) else (
        echo 分块编码中: "%%~dpnF"
        set /a i=1
        call :split_loop_encode "%%~fF" "%%~dpnF"
    )
)
goto done


:split_loop_encode
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
goto split_loop_encode





:decodeLoop
:: ================= 并行解码循环 =================

:: 每次回到循环都按锁文件实时统计活跃任务
set "active=0"
for %%J in (.jobs\*.tmp) do set /a active+=1

:fillSlots
:: 动态 slot 填充判定：只有在未满槽且还有待启动文件时才启动新任务
if !active! GEQ %maxThreads% goto :waitNext
if !currentIndex! GTR %totalFiles% goto :waitNext

:: 准备一次启动
set "fullpath=!file[%currentIndex%]!"
set "filename=!fullpath:.b64=!"
set "jobfile=.jobs\!currentIndex!.tmp"

:: 创建锁文件（信号量）
type nul > "!jobfile!"

:: 日志
echo. && echo [ !fullpath! ] 启动解码 [ %time% ]

:: 启动子任务

start "" /b /min cmd /c "coreutils.exe base64 -d "!fullpath!" > "!filename!" 2>&1 && del /s /q "!jobfile!" && echo [ !filename! ] 解码完成 [ %time% ]"

:: 推进索引（只增不减）
set /a currentIndex+=1

:: 立即回到 fillSlots，再次判断是否还能继续启动（尽量满槽）
:: 注意：active 是基于锁文件计数，需要重新统计
set "active=0"
for %%J in (.jobs\*.tmp) do set /a active+=1
goto :fillSlots

:waitNext
:: 等待任意一个子任务完成，然后马上补位；
:: 同时确保所有任务都启动完且全部完成后才退出解码阶段。
pathping -p 100 -q 1 localhost >nul

:: 重新统计活跃数
set "active=0"
for %%J in (.jobs\*.tmp) do set /a active+=1

:: 如果还有未启动的文件，且未满槽，立刻补位
if !currentIndex! LEQ %totalFiles% if !active! LSS %maxThreads% goto :fillSlots

:: 如果还有任务在跑，继续等待
if !active! GTR 0 (
    rem echo 等待任意子任务完成中... [ %time% ]
    rem echo 当前active=!active! [ %time% ]
    rem echo 当前currentIndex=!currentIndex! [ %time% ]
    goto :waitNext
)

:: 跑到这里说明：所有文件都启动过且所有子任务已结束
echo 所有文件解码完成! (并行解码 + 动态补位) && echo.
goto :EOF





:ScanFile
:: ================= 扫描文件初始化文件队列 =================
:: 自动扫描拖拽文件所在目录的全部 .b64 文件
set fileIndex=0
:: 取第一个拖拽文件的目录作为工作目录
set "WORKDIR=%~dp1"
for %%F in ("%WORKDIR%*.b64") do (
set /a fileIndex+=1
set "file[!fileIndex!]=%%~fF"
)
set totalFiles=%fileIndex%
set currentIndex=1

:: 清理作业文件夹
if exist ".jobs" rd /s /q ".jobs"
mkdir ".jobs"

goto :EOF





:merge_parts
:: ================= 合并子程序 =================

echo 合并工作目录: "%WORKDIR%" && echo.

:: 检查是否存在分块文件
set "hasParts="
for %%f in ("%WORKDIR%*.part0*") do (
    set "hasParts=1"
    goto :foundParts
)

:foundParts
if not defined hasParts (
    echo 未发现任何 .part00N 分块文件，跳过合并。&& echo.
    goto :merge_parts_END
)

echo 已发现分块文件，将按顺序自动合并... && echo.

:: 获取输出文件名（去除 .partNNN）
for %%f in ("%WORKDIR%*.part001") do (
    set "base=%%~nf"
    set "ext=%%~xf"
)

:: 删除 base 末尾的 partNNN
for /f "tokens=1 delims=. " %%a in ("!base!") do set "OUTNAME=%%a"
set "OUTFILE=%WORKDIR%!OUTNAME!"
echo 输出文件名为: "!OUTFILE!" && echo.

:: 按名称顺序合并, 并且统计数量.
set "LIST="
set /a count=1
for /f "delims=" %%f in ('dir /b /on "%WORKDIR%" ^| findstr /r ".*\.part[0-9][0-9][0-9]$"') do (
    if defined LIST (
        set "LIST=!LIST!+%%f"
    ) else (
        set "LIST=%%f"
    )
    echo 准备合并第 !count! 块: %%f && echo.
    set /a count+=1
)
set /a total=count-1
echo 共 %total% 块，开始合并...

:: 开始合并程序.
copy /b !LIST! "%OUTFILE%" >nul && echo.

echo 合并完成: "%OUTFILE%" && echo.

echo 所有文件合并完成! (排序后 copy /b 方式) && echo.
goto :EOF