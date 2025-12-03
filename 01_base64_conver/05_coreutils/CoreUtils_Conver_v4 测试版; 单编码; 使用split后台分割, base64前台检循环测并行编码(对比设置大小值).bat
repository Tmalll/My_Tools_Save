@echo off
setlocal EnableDelayedExpansion

echo ==========================
echo File Split / Merge Tool (coreutils高速版)
echo 拖放文件即可分割或合并
echo 注意: 路径中不能有 "^!" "^`" "^'" "^"" 等符号...
echo ==========================
echo.

:: ================= 用户设置 =================
set "CHUNK_MB=100"        :: 每块大小（单位MB）
set "PART_PAD=3"          :: 分块编号位数（如 3 表示 part001）
:: =============================================

if "%~1"=="" (
    echo 请把文件拖放到此脚本上
    pause
    exit /b
)

:: 检测 coreutils 是否存在
where coreutils.exe >nul 2>&1
if errorlevel 1 (
    echo 未检测到 coreutils.exe，请先安装 uutils.coreutils
    echo 使用命令: winget install uutils.coreutils
    pause
    exit /b
)

:: 记录开始时间（毫秒时间戳）
for /f %%T in ('powershell -NoProfile -Command "[Environment]::TickCount"') do set startTime=%%T

:nextfile
set "FILE=%~1"
set "FILENAME=%~nx1"
set "DIR=%~dp1"

echo.
echo ==========================
echo 处理文件: %FILE%
echo ==========================

echo %FILENAME% | find ".part" >nul
if %errorlevel%==0 (
    echo 检测到 .part 文件，开始合并...
    call :merge_parts "%FILE%"
) else (
    echo 检测到普通文件，准备分割...
    call :split_file "%FILE%"
)

shift
if not "%~1"=="" goto nextfile

:: 记录结束时间（毫秒时间戳）
for /f %%T in ('powershell -NoProfile -Command "[Environment]::TickCount"') do set endTime=%%T
set /a elapsedMs=endTime-startTime
set /a seconds=elapsedMs / 1000
set /a millis=elapsedMs %% 1000
if !millis! lss 10  set "millis=00!millis!"
if !millis! lss 100 set "millis=0!millis!"
echo 所有文件处理完成!
echo 总耗时: !seconds!.!millis! 秒
timeout /t 5 >nul
pause
exit /b


:: ==========================================================
:: 文件分割 (coreutils版)
:: ==========================================================
:split_file
setlocal
set "SRC=%~1"
set "DIR=%~dp1"
set "BASE=%~nx1"

echo 分割大小: %CHUNK_MB% MB
echo 正在使用 coreutils 分割，请稍候...
:: ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== ==========

:: 分割任务
:: 调用 coreutils split 放到后台，并在完成后生成 split.ok
start /min "" cmd /c "coreutils.exe split -b %CHUNK_MB%M -d -a %PART_PAD% "%SRC%" "%DIR%%BASE%.part" && pathping -p 100 -q 1 localhost >nul && echo. > "%DIR%split.ok""
:: 定义分块大小字节数
set /a CHUNK_BYTES=%CHUNK_MB%*1024*1024

:toBase64Encode
:: 如果检测到 split.ok 文件，说明分割已完成
set "split_done=0"
if exist "%DIR%split.ok" set "split_done=1"

for /f "delims=" %%F in ('dir /b "%DIR%*.part*" ^| findstr /r "\.part[0-9][0-9][0-9]$"') do (
    if not exist "%DIR%%%F.b64" (
        for %%S in ("%DIR%%%F") do set "size=%%~zS"

        :: 普通块：大小等于 CHUNK_BYTES
        if !size! EQU %CHUNK_BYTES% (
            echo 文件稳定，启动编码任务：%%F → %%F.b64
            start "" /b coreutils.exe base64 -w 0 < "%DIR%%%F" > "%DIR%%%F.b64"
        ) else (
            :: 最后块：小于 CHUNK_BYTES，但 split 已完成
            if !split_done! EQU 1 (
                echo 最后块检测到，启动编码任务：%%F → %%F.b64
                start "" /b coreutils.exe base64 -w 0 < "%DIR%%%F" > "%DIR%%%F.b64"
                goto :doneEncode
            ) else (
                echo 文件 %%F 还在写入，跳过本轮
            )
        )
    )
)

:: 每200毫秒检测一次
pathping -p 50 -q 1 localhost >nul
goto :toBase64Encode

:doneEncode
echo 所有分块已处理完成。




:: ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== ==========

echo 分割编码完成.
endlocal
goto :eof


:: ==========================================================
:: 文件合并 (coreutils版，一次性调用)
:: ==========================================================
:merge_parts
setlocal EnableDelayedExpansion
set "FIRST=%~1"
set "DIR=%~dp1"
set "BASENAME=%~nx1"

:: 去掉 .part### 后缀，保留扩展名
for /f "delims=" %%a in ("%BASENAME%") do set "OUTNAME=%%~na"
set "OUTFILE=%DIR%%OUTNAME%"

echo.
echo 合并目标: "%OUTFILE%"
echo 正在使用 coreutils 合并，请稍候...

:: 如果目标文件已存在，先删除
if exist "%OUTFILE%" del "%OUTFILE%"

:: 拼接所有分块文件名（按顺序）
set "FILES="
for /f "delims=" %%f in ('dir /b /on "%DIR%%OUTNAME%.part*"') do (
    set "FILES=!FILES! "%DIR%%%f""
)

:: 一次性调用 cat
echo "!FILES!"
coreutils.exe cat !FILES! > "%OUTFILE%"

echo 合并完成。
endlocal
goto :eof
