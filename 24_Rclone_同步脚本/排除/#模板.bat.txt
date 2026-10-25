
set "source=E:\01.userData\ZhuoMian\5m x 20 = 100M"
set "target=\\192.168.1.120\d\test"

:: 连接网络共享, 目标是网络路径时使用, 如果只是本地目录可以注销掉此行
net use "%target%" "qwe123!!0952**" /user:"administrator" /persistent:no

:: 获取时间戳
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH.mm.ss"') do set "timestamp=%%i"

:: 5. 执行 Rclone 同步
rclone sync "%source%" "%target%\#latest" ^
    --backup-dir "%target%\history_%timestamp%" ^
    --transfers 2 ^
    --checkers 2 ^
    --one-file-system ^
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
    
timeout /t 3
:: 被总脚本调用时这里不能有 pause 和 exit 这类会中断脚本的命令.

