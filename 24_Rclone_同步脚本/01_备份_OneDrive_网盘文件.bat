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
echo.

:任务1
echo 启动任务1

:: 目标目录
set "Source1=OD-LiveSkype:"
set "TargetDIR1=D:\#Backup_LocalCache\OneDrive_LocalBak"

echo ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- 
echo 去除 [ %Source1% ] 的重复文件...
:: rclone dedupe newest   "%Source1%" --by-hash --log-level ERROR
echo.

echo 同步 [ %Source1% ] 到 [ %TargetDIR1% ] 开始...
echo. & echo.
rclone sync "%Source1%"   "%TargetDIR1%\01.latest" ^
	--backup-dir  "%TargetDIR1%\02.history\%timestamp%" ^
	--onedrive-expose-onenote-files --onedrive-av-override ^
	--no-update-dir-modtime ^
	--no-update-modtime ^
	--fast-list ^
	--checksum ^
	--transfers 4 ^
	--checkers 4 ^
	--copy-links ^
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
echo 启动任务2

:: 目标目录
set "TargetDIR2=\\192.168.1.120\e\#000-BakDIR\OneDrive_LocalBak"

:: 连接网络共享, 目标是网络路径时使用, 如果只是本地目录可以注销掉此行
net use "%TargetDIR2%" "qwe123!!0952**" /user:"administrator" /persistent:no > NUL 2>&1

echo ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- 
echo 同步 [ %TargetDIR1% ] 到 [ %TargetDIR2% ] 开始...
echo. & echo.
rclone sync "%TargetDIR1%"   "%TargetDIR2%" ^
	--no-update-dir-modtime ^
	--no-update-modtime ^
	--transfers 4 ^
	--checkers 4 ^
	--copy-links ^
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




exit
:: 被总脚本调用时这里不能有 pause 和 exit 这类会中断脚本的命令.

:: --dedupe-mode interactive- 如上所示，具有交互性。
:: --dedupe-mode skip   - 删除相同的文件，然后跳过剩余的所有内容。
:: --dedupe-mode first  - 删除重复文件，保留第一个文件。
:: --dedupe-mode newest - 删除相同文件，保留最新文件。
:: --dedupe-mode oldest - 删除相同文件，保留最旧的文件。
:: --dedupe-mode largest- 删除相同的文件，然后保留最大的文件。
:: --dedupe-mode smallest   - 删除相同的文件，然后保留最小的文件。
:: --dedupe-mode rename - 删除相同文件，然后将剩余文件重命名为不同的名称。
:: --dedupe-mode list   - 仅列出重复的目录和文件，不做任何更改。

















