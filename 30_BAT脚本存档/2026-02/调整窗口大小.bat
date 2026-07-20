@echo off
:: 如果带了 min 参数，说明是分身启动，直接跳过计时器
if "%1"=="min" goto :start_script

:: 设置窗口大小
mode con: cols=80 lines=20
powershell -Command "$h = Get-Host; $ui = $h.UI.RawUI; $ui.BufferSize = New-Object System.Management.Automation.Host.Size($ui.BufferSize.Width, 9999)"

:: 等待时间 此时显性执行, 用户此时可以关闭窗口.
echo 等待30秒或按任意键继续......
timeout /t 30 >nul
echo 脚本已经开始, 3秒后, 开始执行脚本......
timeout /t 1 >nul
echo 脚本已经开始, 2秒后, 开始执行脚本......
timeout /t 1 >nul
echo 脚本已经开始, 1秒后, 开始执行脚本......
timeout /t 1 >nul
echo.
echo.


:: 最小化窗口
cd /d "%~dp0" & title %~nx0
if "%1" neq "min" start /min "" "%~f0" min & exit
:start_script
:: 下面是你原本的代码...
:: %~nx0 是脚本自身名称.
:: %~f0 是完整路径.


echo 当前目录是: %cd%
echo 运行脚本为: %~f0

echo 等待10秒或按任意键继续......
timeout /t 10 >nul
echo 脚本已经开始, 3秒后, 开始执行脚本......
timeout /t 1 >nul
echo 脚本已经开始, 2秒后, 开始执行脚本......
timeout /t 1 >nul
echo 脚本已经开始, 1秒后, 开始执行脚本......
timeout /t 1 >nul
echo.
echo.




:clear_Catsxp_Mega_Cache
echo clear_Catsxp_Mega_Cache 开始
echo.

start /min "" cmd /c  "D:\01.Program_Soft\01-浏览器\05.catsxp\清理Mega网盘缓存.bat"
echo 执行 [ start /min "" cmd /c  "D:\01.Program_Soft\01-浏览器\05.catsxp\清理Mega网盘缓存.bat" ] 完成
echo.
echo.


:clear_7_day
echo clear_7_day 开始
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


:bak_1
echo bak_1 开始
echo.

start /min "" cmd /c "echo 备份锁屏画报 & echo 脚本将在30秒后开始执行... & timeout /t 30  >nul && "E:\01.userData\ZhuoMian\04.图片\#02-锁屏画报\备份锁屏画报.bat"
start /min "" cmd /c "echo 备份网盘文件 & echo 脚本将在30秒后开始执行... & timeout /t 30  >nul && "E:\01.userData\ZhuoMian\10.同步盘\备份网盘文件.bat"
echo 执行 [ 文件备份任务1, 备份 [OD个人网盘, 锁屏画报] 并行运行 - 等待30秒后运行 ]
echo.
echo.


:bak_2
echo bak_2 开始
echo.

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
pathping -p 1000 -q 1 localhost >nul
echo ***** ***** 开始执行 [ CobianReflector ] 备份任务 2 ***** ***** && echo.
pathping -p 1000 -q 1 localhost >nul 
echo ***** ***** 开始执行 [ CobianReflector ] 备份任务 1 ***** ***** && echo.
pathping -p 1000 -q 1 localhost >nul
:: 参考命令 powershell Restart-Service -Name "CobianReflectorService" -Force -ErrorAction Stop && echo.
powershell -NoProfile -Command "try { Restart-Service -Name 'CobianReflectorService' -Force -ErrorAction Stop; $svc = Get-Service -Name 'CobianReflectorService'; if ($svc.Status -eq 'Running') { Write-Host '[ CobianReflectorService ] 重启成功, 服务已成功运行' `n} else { Write-Host '[ CobianReflectorService ] 服务未成功启动，当前状态: ' $svc.Status `n} } catch { Write-Host '[ CobianReflectorService ] 重启失败: ' $_.Exception.Message `n}"
echo.
echo.


:bak_3
echo bak_3 开始
echo.

:: echo 备份D2R配置和存档.
:: timeout /t 1 >nul
:: start  /min  ""  "E:\01.userData\Saved Games\D2R_BAK.bat"
echo.
echo.


:rclone_mount
echo rclone_mount 开始
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


:重启浏览器
echo 重启浏览器 开始
echo.

:: echo 执行浏览器启动任务.
:: 		start /min "" "D:\01.Program_Soft\01-浏览器\01.CentBrowser\CentBrowser_v5_2502\chrome.exe" && timeout /t 1 /nobreak >nul && powershell (New-Object -ComObject Shell.Application).MinimizeAll()
:: 		start /min "" "D:\01.Program_Soft\01-浏览器\07.Opera\OperaPortable\opera.exe" && timeout /t 1 /nobreak >nul && powershell (New-Object -ComObject Shell.Application).MinimizeAll()
:: 		start /min "" "D:\01.Program_Soft\01-浏览器\06.brave_browser\brave-v1.75.175-win32-x64\brave.exe" && timeout /t 1 /nobreak >nul && powershell (New-Object -ComObject Shell.Application).MinimizeAll()
:: 		start /min "" "D:\01.Program_Soft\01-浏览器\02.Chrome_Latest\Chrome\chrome.exe" && timeout /t 1 /nobreak >nul && powershell (New-Object -ComObject Shell.Application).MinimizeAll()
:: 		start /min "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" && timeout /t 1 /nobreak >nul && powershell (New-Object -ComObject Shell.Application).MinimizeAll()
:: 		start /min "" "D:\01.Program_Soft\01-浏览器\03.FirefoxNEW\Iceweasel_FirefoxPlus\Iceweasel_x64\App\Iceweasel.exe" && timeout /t 1 /nobreak >nul && powershell (New-Object -ComObject Shell.Application).MinimizeAll()
:: 		start /min "" "D:\01.Program_Soft\01-浏览器\08.vivaldi\vivaldi.exe" && timeout /t 1 /nobreak >nul && powershell (New-Object -ComObject Shell.Application).MinimizeAll()
:: 		start /min "" "D:\01.Program_Soft\01-浏览器\09.Yandex\Browser\browser.exe" && timeout /t 1 /nobreak >nul && powershell (New-Object -ComObject Shell.Application).MinimizeAll()
:: 		start /min "" "D:\01.Program_Soft\01-浏览器\05.猫眼浏览器\catsxp.exe" && timeout /t 1 /nobreak >nul && powershell (New-Object -ComObject Shell.Application).MinimizeAll()
 		start /min "" "D:\01.Program_Soft\Telegram\Bin\Telegram.exe" && timeout /t 1 /nobreak >nul && powershell (New-Object -ComObject Shell.Application).MinimizeAll()
:: powershell (New-Object -ComObject Shell.Application).MinimizeAll()
:: pathping -p 100 -q 1 localhost >nul
echo.
echo.


:重启Foxmail
echo 重启Foxmail 开始
echo.

taskkill /f /t /im Foxmail.exe
pathping -p 100 -q 1 localhost >nul
taskkill /f /t /im Foxmail.exe
pathping -p 100 -q 1 localhost >nul
taskkill /f /t /im Foxmail.exe
pathping -p 100 -q 1 localhost >nul
start /min "" "D:\01.Program_Soft\12-eMail_Client\Foxmail\Foxmail.exe"
pathping -p 100 -q 1 localhost >nul
echo.
echo.


:END_Exit
echo END_Exit 开始
echo.

echo 启动运行脚本执行完毕, 10 秒后结束并关闭此窗口...... && echo.
timeout /t 1 >nul
echo 启动运行脚本执行完毕, 9 秒后结束并关闭此窗口...... && echo.
timeout /t 1 >nul
echo 启动运行脚本执行完毕, 8 秒后结束并关闭此窗口...... && echo.
timeout /t 1 >nul
echo 启动运行脚本执行完毕, 7 秒后结束并关闭此窗口...... && echo.
timeout /t 1 >nul
echo 启动运行脚本执行完毕, 6 秒后结束并关闭此窗口...... && echo.
timeout /t 1 >nul
echo 启动运行脚本执行完毕, 5 秒后结束并关闭此窗口...... && echo.
timeout /t 1 >nul
echo 启动运行脚本执行完毕, 4 秒后结束并关闭此窗口...... && echo.
timeout /t 1 >nul
echo 启动运行脚本执行完毕, 3 秒后结束并关闭此窗口...... && echo.
timeout /t 1 >nul
echo 启动运行脚本执行完毕, 2 秒后结束并关闭此窗口...... && echo.
timeout /t 1 >nul
echo 启动运行脚本执行完毕, 1 秒后结束并关闭此窗口...... && echo.
timeout /t 1 >nul
echo.
echo.

exit







