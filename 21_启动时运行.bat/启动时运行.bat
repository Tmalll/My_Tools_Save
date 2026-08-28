@echo off
:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: 将初始目录锁定在脚本所在目录.
cd /d "%~dp0" & title %~nx0

:: 判断并设置窗口尺寸
if "%1"=="min" (
    mode con: cols=120 lines=40
    goto :start_script
)

:: 设置当前CMD窗口大小
mode con: cols=80 lines=20

:: 通过注册表强制将 CMD 默认窗口大小设为 120 (宽) x 40 (高)
reg add "HKCU\Console" /v "WindowSize" /t REG_DWORD /d 0x00280078 /f >nul
reg add "HKCU\Console" /v "ScreenBufferSize" /t REG_DWORD /d 0x03E80078 /f >nul


:延迟15秒脚本
cls
set SECONDS=15 & set interval_MS=10 & set skip_MS=3000 & set skip_min_Interval_MS=50
powershell -NoProfile -Command "$m=%SECONDS%*1000;$skipS=%skip_MS%/1000;$lastTick=0;$line=[Console]::CursorTop;while($m -gt 0){[Console]::SetCursorPosition(0,$line);$display=[math]::Max($m/1000,0);Write-Host -NoNewline ('剩余 {0,6:F3} 秒后继续... [空格跳过 {1:F1}s ^| Enter/Esc 立即跳过]   ' -f $display,$skipS);if([Console]::KeyAvailable){$key=[Console]::ReadKey($true);$now=(Get-Date).Ticks;if($key.Key -eq 'Spacebar'){if(($now-$lastTick) -gt %skip_min_interval_MS%0000){$m-=%skip_MS%;$lastTick=$now}}elseif($key.Key -in 'Enter','Escape'){break};while([Console]::KeyAvailable){$null=[Console]::ReadKey($true)}};Start-Sleep -Milliseconds %interval_MS%;$m-=%interval_MS%};[Console]::SetCursorPosition(0,$line);Write-Host '延迟结束，开始执行脚本...                     '"
timeout /t 2 >nul
cls


:最小化窗口
cd /d "%~dp0" & title %~nx0
if "%1" neq "min" start /min "" "%~f0" min & exit
:start_script
:: 这下面放最小化之后的脚本...
echo.
echo 当前目录是: %cd%
echo 运行脚本为: %~f0
echo.
echo.

:先行脚本
:: start  /min  ""  "E:\01.userData\Saved Games\D2R_BAK.bat" ::备份暗黑2存档
start  /min  ""  "E:\01.userData\Documents\My Games\Fallout4_BAK.bat"

start  /min  ""  "E:\01.userData\ZhuoMian\工具存档\21_启动时运行.bat\禁用文件共享防火墙规则.bat"
explorer.exe "E:\01.userData\ZhuoMian\工具存档\24_Rclone_同步脚本\#开始Rclone同步任务.bat"
explorer.exe "E:\01.userData\ZhuoMian\工具存档\#02.同步仓库_工具.bat"
explorer.exe "D:\Rclone\#同步Rclone_Bak仓库.bat"
explorer.exe "%~dp0用户权限脚本.bat"


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


:Cobian_Reflector_备份任务
echo Cobian_Reflector_备份任务 - 开始 & echo.
timeout /t 5 >nul

:: 检查 Cobian Reflector UI 是否正在运行
rem tasklist /FI "IMAGENAME eq Cobian.Reflector.UserInterface.exe" /FO CSV | findstr /I "Cobian.Reflector.UserInterface.exe" >nul
if %ERRORLEVEL% equ 0 (
    echo [ Cobian Reflector UI ] 已经在运行
) else (
    echo 未找到进程，将重新启动它
    start "" "C:\Program Files\Cobian Reflector\Cobian.Reflector.UserInterface.exe"
)
timeout /t 5 >nul
echo.

:: 启动服务
echo ***** ***** 开始执行 [ CobianReflector ] 备份任务 3 ***** ***** && echo. && pathping -p 500 -q 1 localhost >nul
echo ***** ***** 开始执行 [ CobianReflector ] 备份任务 2 ***** ***** && echo. && pathping -p 500 -q 1 localhost >nul
echo ***** ***** 开始执行 [ CobianReflector ] 备份任务 1 ***** ***** && echo. && pathping -p 500 -q 1 localhost >nul
powershell -NoProfile -Command "try { $name = 'CobianReflectorService'; Set-Service -Name $name -StartupType Manual; $svc = Get-Service -Name $name; if ($svc.Status -ne 'Running') { Start-Service -Name $name -ErrorAction Stop; $action = '启动' } else { Restart-Service -Name $name -Force -ErrorAction Stop; $action = '重启' }; $svc.Refresh(); if ($svc.Status -eq 'Running') { Write-Host \"[ $name ] $action成功, 服务已成功运行`n\" } else { Write-Host \"[ $name ] 服务未成功运行，当前状态: $($svc.Status)`n\" } } catch { Write-Host \"[ CobianReflectorService ] 操作失败: $($_.Exception.Message)`n\" }"
echo.
echo.
timeout /t 2 >nul
:: 后续其他脚本....


:END_Exit
echo 脚本运行完毕30秒后关闭本窗口...
timeout /t 5 && timeout /t 5 && timeout /t 5
timeout /t 5 && timeout /t 5 && timeout /t 5

exit








