@echo off
:: 将初始目录锁定在脚本所在目录.
cd /d "%~dp0" & title %~nx0

:: 判断并设置窗口尺寸
if "%1"=="min" (
    mode con: cols=120 lines=40
    explorer.exe "E:\01.userData\ZhuoMian\用户权限脚本.bat"
    goto :start_script
)

:: 设置当前CMD窗口大小
mode con: cols=80 lines=20

:: 通过注册表强制将 CMD 默认窗口大小设为 120 (宽) x 40 (高)
reg add "HKCU\Console" /v "WindowSize" /t REG_DWORD /d 0x00280078 /f >nul
reg add "HKCU\Console" /v "ScreenBufferSize" /t REG_DWORD /d 0x03E80078 /f >nul


:: 延迟15秒脚本
cls
set SECONDS=15 & set interval_MS=10 & set skip_MS=3000 & set skip_min_Interval_MS=50
powershell -NoProfile -Command "$m=%SECONDS%*1000;$skipS=%skip_MS%/1000;$lastTick=0;$line=[Console]::CursorTop;while($m -gt 0){[Console]::SetCursorPosition(0,$line);$display=[math]::Max($m/1000,0);Write-Host -NoNewline ('剩余 {0,6:F3} 秒后继续... [空格跳过 {1:F1}s ^| Enter/Esc 立即跳过]   ' -f $display,$skipS);if([Console]::KeyAvailable){$key=[Console]::ReadKey($true);$now=(Get-Date).Ticks;if($key.Key -eq 'Spacebar'){if(($now-$lastTick) -gt %skip_min_interval_MS%0000){$m-=%skip_MS%;$lastTick=$now}}elseif($key.Key -in 'Enter','Escape'){break};while([Console]::KeyAvailable){$null=[Console]::ReadKey($true)}};Start-Sleep -Milliseconds %interval_MS%;$m-=%interval_MS%};[Console]::SetCursorPosition(0,$line);Write-Host '延迟结束，开始执行脚本...                     '"
cls

:: 最小化窗口
cd /d "%~dp0" & title %~nx0
if "%1" neq "min" start /min "" "%~f0" min & exit
:start_script
:: 这下面放最小化之后的脚本...
echo.
echo 当前目录是: %cd%
echo 运行脚本为: %~f0
echo.
echo.

:清理mega网盘缓存
echo 清理mega网盘缓存 - 开始
echo.

start /min "" cmd /c  "D:\01.Program_Soft\01-浏览器\05.catsxp\清理Mega网盘缓存.bat"
echo 执行 [ start /min "" cmd /c  "D:\01.Program_Soft\01-浏览器\05.catsxp\清理Mega网盘缓存.bat" ] 完成
echo.
echo.
timeout /t 2 >nul

:清理7天未使用的临时文件
echo 清理7天未使用的临时文件 - 开始
echo.

echo 清理 [ 7 天未访问的文件 ] && echo.
set "TARGET=C:\Users\Administrator\AppData\Local\Temp"
echo 清理 [ %TARGET% ] 开始 && echo.
:: ---- 第一条：删除 7 天未访问的文件 ----
powershell -NoProfile -Command "Get-ChildItem -Path '%TARGET%' -Recurse -File | Where-Object { $_.LastAccessTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force -ErrorAction SilentlyContinue"
:: ---- 第二条：删除空目录（倒序） ----
powershell -NoProfile -Command "Get-ChildItem -Path '%TARGET%' -Recurse -Directory | Sort-Object FullName -Descending | ForEach-Object { if(-not (Get-ChildItem $_.FullName -Force -ErrorAction SilentlyContinue)) { Remove-Item $_.FullName -Force -Recurse -ErrorAction SilentlyContinue } }"
echo 清理 [ %TARGET% ] 结束
echo.
echo.
timeout /t 2 >nul

:日常备份1
echo 日常备份1 - 开始
echo.

start /min "" cmd /c "title 备份锁屏画报 & echo 备份锁屏画报 & echo 脚本将在15秒后开始执行... & timeout /t 15  >nul && "E:\01.userData\ZhuoMian\04.图片\#02-锁屏画报\备份锁屏画报.bat"
start /min "" cmd /c "title 备份锁屏画报 & echo 备份网盘文件 & echo 脚本将在15秒后开始执行... & timeout /t 15  >nul && "E:\01.userData\ZhuoMian\10.同步盘\备份网盘文件.bat"
echo 执行 [ 文件备份任务1, 备份 [OD个人网盘, 锁屏画报] 并行运行 - 等待30秒后运行 ]
echo.
echo.
timeout /t 2 >nul

:Cobian_Reflector_备份任务
echo Cobian_Reflector_备份任务 - 开始

:: 检测系统运行秒数
set "uptime=0"
for /f %%i in ('powershell -NoProfile -Command "[int]((Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime).TotalSeconds"') do set "uptime=%%i"
if %uptime% LSS 3600 (
    echo ----- [ 跳过 ] ----- 当前系统运行时间仅为 %uptime% 秒，跳过此次任务 ----- [ 跳过 ] -----
    echo.
    goto :bak_2_end
)

echo ----- [任务开始] ----- 当前系统运行时间为 %uptime% 秒 ----- [任务开始] -----
echo.
echo Cobian Reflector 备份任务 - 开始
echo.

echo 10秒后开始 Cobian Reflector 备份任务检测
timeout /t 10 >nul

:: 检查 Cobian Reflector UI 是否正在运行
tasklist /FI "IMAGENAME eq Cobian.Reflector.UserInterface.exe" /FO CSV | findstr /I "Cobian.Reflector.UserInterface.exe" >nul
if %ERRORLEVEL% equ 0 (
    echo [ Cobian Reflector UI ] 已经在运行
) else (
    echo 未找到进程，将重新启动它
    start "" "C:\Program Files\Cobian Reflector\Cobian.Reflector.UserInterface.exe"
)

:: 文件备份任务2, [ CobianReflector ] 备份任务
echo.
echo ***** ***** 开始执行 [ CobianReflector ] 备份任务 3 ***** ***** && echo.
pathping -p 500 -q 1 localhost >nul
echo ***** ***** 开始执行 [ CobianReflector ] 备份任务 2 ***** ***** && echo.
pathping -p 500 -q 1 localhost >nul 
echo ***** ***** 开始执行 [ CobianReflector ] 备份任务 1 ***** ***** && echo.
pathping -p 500 -q 1 localhost >nul
:: 参考命令 powershell Restart-Service -Name "CobianReflectorService" -Force -ErrorAction Stop && echo.
powershell -NoProfile -Command "try { Restart-Service -Name 'CobianReflectorService' -Force -ErrorAction Stop; $svc = Get-Service -Name 'CobianReflectorService'; if ($svc.Status -eq 'Running') { Write-Host '[ CobianReflectorService ] 重启成功, 服务已成功运行' `n} else { Write-Host '[ CobianReflectorService ] 服务未成功启动，当前状态: ' $svc.Status `n} } catch { Write-Host '[ CobianReflectorService ] 重启失败: ' $_.Exception.Message `n}"
echo.
echo.
:bak_2_end
timeout /t 2 >nul
:: 后续其他脚本....




:备份暗黑2存档
echo 备份暗黑2存档 - 开始
echo.

:: echo 备份D2R配置和存档.
:: timeout /t 1 >nul
:: start  /min  ""  "E:\01.userData\Saved Games\D2R_BAK.bat"
echo.
echo.
timeout /t 2 >nul

:rclone挂载任务
echo rclone挂载任务 - 开始
echo.

:: Rclone 挂载任务
rem echo 执行rclone挂载任务...... 使用powershell隐藏运行.
rem set http_proxy=socks5h://192.168.1.40:10800
rem set https_proxy=%http_proxy%
rem set HTTP_PROXY=%http_proxy%
rem set HTTPS_PROXY=%http_proxy%
rem taskkill /f /t /im rclone.exe
rem del /q E:\01.userData\ZhuoMian\Rclone.log
rem pathping -p 500 -q 1 localhost >nul
rem start /min "" powershell.exe -WindowStyle Hidden -Command "rclone.exe serve webdav GD-MiaoSKY-Torrent: --addr :8001 --user master --pass qwe123!!@@  --vfs-cache-mode full  --log-file 'E:\01.userData\ZhuoMian\Rclone\Rclone.log' --log-level DEBUG"
rem timeout /t 5 >nul
echo.
echo.
timeout /t 2 >nul

:END_Exit
echo 脚本运行完毕30秒后关闭本窗口...
timeout /t 5 && timeout /t 5 && timeout /t 5
timeout /t 5 && timeout /t 5 && timeout /t 5

exit








