@echo off
chcp 65001 >nul
echo 开始执行 [ %~nx0 ]
title [ %~nx0 ]
echo.

:: 设置代理服务器
set "http_proxy=socks5h://192.168.1.40:10801"
set "https_proxy=%http_proxy%"
set "HTTP_PROXY=%http_proxy%"
set "HTTPS_PROXY=%http_proxy%"

:: 获取时间戳
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH.mm.ss"') do set "timestamp=%%i"

:任务1
echo 启动任务1

:: 目标目录
set "Source1=E:\01.userData\Documents"
set "TargetDIR1=D:\#Backup_LocalCache\Master100_Documents"

echo ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- 
echo 同步 [ %Source1% ] 到 [ %TargetDIR1% ] 开始...
echo. & echo.
rclone sync "%Source1%"  "%TargetDIR1%\01.latest" ^
    --backup-dir         "%TargetDIR1%\02.history\%timestamp%" ^
    --no-update-dir-modtime ^
    --no-update-modtime ^
    --onedrive-expose-onenote-files ^
    --transfers 4 ^
    --checkers 4 ^
    --one-file-system ^
    --copy-links ^
    --exclude "**/Xshell/applog/**" ^
    --exclude "**/Xftp/applog/**" ^
    --exclude "/排除测试文件夹1-位于根目录中的/**" ^
    --exclude "**/排除测试文件夹2-位于非根目录-只存在于子目录中的/**" ^
    --exclude "/排除特定文件1_位于根目录中的" ^
    --exclude "**/排除特定文件2_位于子目录中的" ^
    --exclude "*.log 排除某种特定文件类型" ^
    --timeout 10s ^
    --contimeout 10s ^
    --retries 3 ^
    --low-level-retries 3 ^
    --log-level INFO
echo.
echo 同步 [ %Source1% ] 到 [ %TargetDIR1% ] 完成...
timeout /t 1 > NUL
echo. & echo. & echo.
:: --log-level LogLevel  Log level DEBUG|INFO|NOTICE|ERROR (default NOTICE)



:任务2
echo 启动任务2, RAR归档...
echo ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- 

:: 基础变量
set "SOURCE=%TargetDIR1%"
set "Archives_DIR=%TargetDIR1%\Archives"
set "bakName=Master100_Documents"
set "rarPath=C:\Program Files\WinRAR\Rar.exe"
set "RAR_ARGS=a -m3 -tl -htb -oc -ep1 -idq -x"*\Archives\*" "

:: 备份节奏与清理控制变量
set "IntervalHours=24"
set "RetentionDays=60"
echo 设置归档间隔时间为: [ %IntervalHours% ] 小时...
echo.
echo 设置保留归档时间为: [ %RetentionDays% ] 天...
echo.

if not exist "%Archives_DIR%" mkdir "%Archives_DIR%"

echo 正在检查上一次归档时间间隔...
set "RUN_BACKUP=0"
for /f %%A in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$latest=Get-ChildItem -Path '%Archives_DIR%' -Filter '%bakName%_*.rar' -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1; if($latest){ if(((Get-Date)-$latest.LastWriteTime).TotalHours -ge %IntervalHours%){ 1 }else{ 0 } }else{ 1 }"') do (
    set "RUN_BACKUP=%%A"
)

if "%RUN_BACKUP%"=="1" (
    :: 使用你指定的命令获取标准时间戳
    for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH.mm.ss"') do set "timestamp=%%i"
    echo.
    echo [状态] 满足备份条件，开始归档...
    echo.
    :: 纯原生 BAT 调用 WinRAR
    "%rarPath%" %RAR_ARGS% "%Archives_DIR%\%bakName%_%timestamp%.rar" "%SOURCE%"
    if errorlevel 0 (echo. && echo [成功] 备份归档已完成。&& echo.) else (echo. && echo [错误] 备份失败，错误码: %errorlevel% && echo.)
) else (
    echo.
    echo [跳过] 距离上一次归档不足 [ %IntervalHours% ] 小时，今日不再备份。
    echo.
)

echo 正在检查并清理 %RetentionDays% 天之前的旧备份...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$limitDate=(Get-Date).AddDays(-%RetentionDays%); Get-ChildItem -Path '%Archives_DIR%' -Filter '%bakName%_*.rar' -File | Where-Object { $_.LastWriteTime -lt $limitDate } | Remove-Item -Force"
echo.

echo 归档任务执行完毕...
timeout /t 1 > NUL
echo. & echo. & echo.

:任务3
echo 启动任务3

set "TargetDIR2=\\192.168.1.120\e\#000-BakDIR\Master100_Documents"
net use "%TargetDIR2%" "qwe123!!0952**" /user:"administrator" /persistent:no > nul 2>&1

echo ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- 
echo 同步 [ %TargetDIR1% ] 到 [ %TargetDIR2% ] 开始...
echo. & echo.
rclone sync "%TargetDIR1%"   "%TargetDIR2%" ^
    --no-update-dir-modtime ^
    --no-update-modtime ^
    --transfers 4 ^
    --checkers 4 ^
    --one-file-system ^
    --copy-links ^
    --exclude "**/Xshell/applog/**" ^
    --exclude "**/Xftp/applog/**" ^
    --exclude "/排除测试文件夹1-位于根目录中的/**" ^
    --exclude "**/排除测试文件夹2-位于非根目录-只存在于子目录中的/**" ^
    --exclude "/排除特定文件1_位于根目录中的" ^
    --exclude "**/排除特定文件2_位于子目录中的" ^
    --exclude "*.log 排除某种特定文件类型" ^
    --timeout 10s ^
    --contimeout 10s ^
    --retries 3 ^
    --low-level-retries 3 ^
    --log-level INFO
echo.
echo 同步 [ %TargetDIR1% ] 到 [ %TargetDIR2% ] 完成...
timeout /t 1 > NUL
echo. & echo. & echo.
:: --log-level LogLevel  Log level DEBUG|INFO|NOTICE|ERROR (default NOTICE)



echo 所有任务都已完成, 10秒后退出脚本...
timeout /t 10 > NUL
exit

:: --dedupe-mode interactive        - 如上所示，具有交互性。
:: --dedupe-mode skip               - 删除相同的文件，然后跳过剩余的所有内容。
:: --dedupe-mode first              - 删除重复文件，保留第一个文件。
:: --dedupe-mode newest             - 删除相同文件，保留最新文件。
:: --dedupe-mode oldest             - 删除相同文件，保留最旧的文件。
:: --dedupe-mode largest            - 删除相同的文件，然后保留最大的文件。
:: --dedupe-mode smallest           - 删除相同的文件，然后保留最小的文件。
:: --dedupe-mode rename             - 删除相同文件，然后将剩余文件重命名为不同的名称。
:: --dedupe-mode list               - 仅列出重复的目录和文件，不做任何更改。












