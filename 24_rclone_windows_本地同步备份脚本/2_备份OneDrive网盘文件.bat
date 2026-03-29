:: 源文件目录
set "source=E:\01.userData\ZhuoMian\10.同步盘\OneDrive_个人\wutongskype@live.com"

:: robocopy拉取镜像的本地缓存目录
set "localCache=D:\OneDrive_LocalCache"

:: 拉取本地镜像
robocopy "%source%"   "%localCache%" /MIR /MT:4 /R:3 /W:3 /NP /NFL /NDL > "%localCache%\robocopy.log"
:: 参数说明:
:: /MIR 镜像同步（新增/修改/删除都同步）
:: /R:2 失败重试次数
:: /W:3 重试等待 3 秒
:: /FFT 用 FAT 时间精度（2秒容差）
:: /XJ 排除 Junction / 目录联接点
:: /SL 复制符号链接本身，而不是跟随链接目标
:: /NP 不显示百分比
:: /NFL 不列文件
:: /NDL 不列目录
:: /MT:8 多线程复制


:: rclone部分
:: 最终备份目标目录rclone
set "target=\\192.168.1.120\e\#16-OD网盘备份"

:: 连接网络共享, 目标是网络路径时使用, 如果只是本地目录可以注销掉此行
net use "%target%" "qwe123!!0952**" /user:"administrator" /persistent:no

:: 获取时间戳
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH.mm.ss"') do set "timestamp=%%i"

:: 5. 执行 Rclone 同步
rclone sync "%localCache%" "%target%\#latest" ^
    --backup-dir "%target%\history_%timestamp%" ^
    --transfers 2 ^
    --checkers 2 ^
    --copy-links ^
    --timeout 10s ^
    --contimeout 10s ^
    --retries 3 ^
    --low-level-retries 3 ^
    --exclude "/robocopy.log" ^
    --log-level INFO
    
timeout /t 3
:: 被总脚本调用时这里不能有 pause 和 exit 这类会中断脚本的命令.

::       --log-level LogLevel                  Log level DEBUG|INFO|NOTICE|ERROR (default NOTICE)

rem    --exclude "/排除测试文件夹1-位于根目录中的/**" ^
rem    --exclude "**/排除测试文件夹2-位于非根目录-只存在于子目录中的/**" ^
rem    --exclude "/排除特定文件1_位于根目录中的" ^
rem    --exclude "**/排除特定文件2_位于子目录中的" ^
rem    --exclude "*.log 排除某种特定文件类型" ^
