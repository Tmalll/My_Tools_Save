@echo off
setlocal enabledelayedexpansion

:: ================== 自定义配置参数 ==================
:: 一次读取多少个文件
set /a "FILE_COUNT_PER_BATCH=100"

:: 每下载完一批，休息多少秒
set "SLEEP_SECONDS=5"

:: aria2c.exe 的路径
set "ARIA_EXE=aria2c.exe"

:: 核心 aria2 参数调整（引入强制分块完整性校验）
set "aria2c_args=--max-concurrent-downloads=4 --max-connection-per-server=8 --split=2 --min-split-size=10m --all-proxy=http://192.168.1.29:10800 --file-allocation=none --max-download-limit=10m --check-certificate=false --check-integrity=true --log-level=notice --console-log-level=notice --auto-file-renaming=false --continue=true --allow-overwrite=true --force-save=true --log=aria2c-log.txt"
:: ====================================================
:: --log-level=debug --console-log-level=debug
:: --conditional-get=true
:: --allow-overwrite=true | 如果控制文件不存在, 则重新开始下载.
:: --force-save=true | 始终保留控制文件.
:: --check-integrity=true | 进行文件完整性检查, http下载依赖hash值
:: 日志级别 LEVEL is either debug, info, notice, warn or error. Default: debug 
:: 控制台日志级别 LEVEL is either debug, info, notice, warn or error. Default: notice


set "LIST_FILE=%~dp0aria2-list.txt"
set "TEMP_CHUNK=%~dp0aria2_chunk.txt"

if not exist "%LIST_FILE%" (
    echo [错误] 未找到 %LIST_FILE% 文件，请先运行抓取脚本。
    pause
    exit /b
)

:: 计算每次需要读取的行数, 一个文件占用多少行.
set /a "LINES_PER_BATCH=%FILE_COUNT_PER_BATCH% * 5"

:: 先用 PowerShell 在内存中获取总行数，用来算总批次
for /f %%A in ('powershell -NoProfile -Command "(Get-Content -LiteralPath '%LIST_FILE%').Count"') do set "TOTAL_LINES=%%A"
set /a "TOTAL_BATCH=(%TOTAL_LINES% + %LINES_PER_BATCH% - 1) / %LINES_PER_BATCH%"

echo [信息] 开始分批下载任务（已开启强校验模式）...
echo [信息] 总任务行数: %TOTAL_LINES% 行，预计分 %TOTAL_BATCH% 批执行
echo [信息] 每批次下载文件数: %FILE_COUNT_PER_BATCH% 个 (共 %LINES_PER_BATCH% 行)
echo [信息] 批次间歇休息时间: %SLEEP_SECONDS% 秒
echo --------------------------------------------------

set /a "MAX_INDEX=%TOTAL_LINES% - 1"
set "BATCH_INDEX=1"

for /L %%I in (0, %LINES_PER_BATCH%, %MAX_INDEX%) do (
    
    echo.
    echo --------------------------------------------------
    echo [Batch !BATCH_INDEX! / %TOTAL_BATCH%] 正在从第 %%I 行截取切片...
    
    powershell -NoProfile -Command "$lines = Get-Content -LiteralPath '%LIST_FILE%'; $end = [Math]::Min(%%I + %LINES_PER_BATCH% - 1, $lines.Count - 1); [System.IO.File]::WriteAllLines('%TEMP_CHUNK%', $lines[%%I..$end])"
    
    if exist "%TEMP_CHUNK%" (
        echo [Batch !BATCH_INDEX!] 正在提交到 aria2c 并校验历史分块...
        "%ARIA_EXE%" -i "%TEMP_CHUNK%" %aria2c_args%
        
        :: 检查 aria2 退出状态码，如果发生非正常中断或文件最终写入错误，强制拦截
        if errorlevel 1 (
            echo.
            powershell -NoProfile -Command "Write-Host '[错误] Batch !BATCH_INDEX! 在下载或校验过程中出现异常中断！错误码: '%ERRORLEVEL%'' -ForegroundColor Red"
            echo [提示] 存在损坏或未完成的文件，对应的 .aria2 控制文件已保留在下载目录中。
            echo [提示] 请修复网络或检查磁盘后，按任意键尝试重新下载当前批次...
            pause
            :: 减去当前步长，实现就地重试该批次
            set /a "BATCH_INDEX-=1"
            goto :retry_batch
        )
        
        del /f /q "%TEMP_CHUNK%"
    )
    
    if !BATCH_INDEX! LSS %TOTAL_BATCH% (
        echo [Batch !BATCH_INDEX!] 本批次校验通过并下载完成。
        timeout /t %SLEEP_SECONDS%
    )
    
    set /a "BATCH_INDEX+=1"
    
    :retry_batch
    :: 用于重试的锚点占位
)

echo --------------------------------------------------
echo [提示] 所有分批下载任务已执行完毕，归档文件完整性校验通过！
pause