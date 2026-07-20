@echo off
chcp 65001 >nul
echo 开始执行 [ %~nx0 ] & title [ %~nx0 ]
echo.

:: 设置代理服务器
set "http_proxy=socks5h://192.168.1.40:10801"
set "https_proxy=%http_proxy%"
set "HTTP_PROXY=%http_proxy%"
set "HTTPS_PROXY=%http_proxy%"

:: 获取时间戳
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH.mm.ss"') do set "timestamp=%%i"

:任务3
echo 启动任务3

:: 目标目录
set "Source1=E:\01.userData\ZhuoMian\02.软件"
set "TargetDIR3=\\192.168.1.120\e\#014-Master100_ZhuoMian\ZhuoMian_软件"
net use "%TargetDIR3%" "qwe123!!0952**" /user:"administrator" /persistent:no > nul 2>&1

:: echo ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- 
:: echo 去除 [ %TargetDIR3% ] 的重复文件...
:: rclone dedupe newest  "%TargetDIR3%" --by-hash --log-level ERROR
:: echo.

echo ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- 
echo 同步 [ %Source1% ] 到 [ %TargetDIR3% ] 开始...
echo. & echo.
rclone sync "%Source1%"  "%TargetDIR3%\01.latest" ^
    --backup-dir         "%TargetDIR3%\02.history\%timestamp%" ^
    --no-update-dir-modtime ^
    --no-update-modtime ^
    --modify-window 2s ^
    --fast-list ^
    --checksum  ^
    --drive-chunk-size 128M ^
    --transfers 3 ^
    --checkers 3 ^
    --copy-links ^
    --timeout 10s ^
    --contimeout 10s ^
    --retries 3 ^
    --low-level-retries 3 ^
    --log-level INFO
echo.
echo 同步 [ %Source1% ] 到 [ %TargetDIR3% ] 完成...
timeout /t 1 > NUL
echo. & echo. & echo.
:: --log-level LogLevel  Log level DEBUG|INFO|NOTICE|ERROR (default NOTICE)




echo 所有任务都已完成, 10秒后退出脚本...
timeout /t 10 > NUL
exit
:: ---------- 脚本结束分割线 ---------- 脚本结束分割线 ---------- 脚本结束分割线 ---------- 脚本结束分割线 ----------

:: --dedupe-mode interactive        - 如上所示，具有交互性。
:: --dedupe-mode skip               - 删除相同的文件，然后跳过剩余的所有内容。
:: --dedupe-mode first              - 删除重复文件，保留第一个文件。
:: --dedupe-mode newest             - 删除相同文件，保留最新文件。
:: --dedupe-mode oldest             - 删除相同文件，保留最旧的文件。
:: --dedupe-mode largest            - 删除相同的文件，然后保留最大的文件。
:: --dedupe-mode smallest           - 删除相同的文件，然后保留最小的文件。
:: --dedupe-mode rename             - 删除相同文件，然后将剩余文件重命名为不同的名称。
:: --dedupe-mode list               - 仅列出重复的目录和文件，不做任何更改。









