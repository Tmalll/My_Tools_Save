@echo off
rem 最小化窗口
if "%1" neq "min" start "" /min "%~f0" min & exit
cd /d "%~dp0"

rem 从这个地址下载Tracker列表
curl -L -o all_aria2.txt https://fastly.jsdelivr.net/gh/XIU2/TrackersListCollection/all_aria2.txt

rem 原位替换命令：遍历配置文件的每一行，匹配到 bt-tracker= 时就地替换，其余行原样保留
powershell -NoProfile -ExecutionPolicy Bypass -Command "$conf='aria2.conf'; if(Test-Path $conf){ try { $enc=[System.Text.Encoding]::Default; $trackers=[System.IO.File]::ReadAllText('all_aria2.txt', $enc).Trim(); if([string]::IsNullOrEmpty($trackers)){ throw 'Tracker列表内容为空' }; $lines=[System.IO.File]::ReadAllLines($conf, $enc); $replaced=$false; for($i=0; $i -lt $lines.Length; $i++){ if($lines[$i] -match '^bt-tracker='){ $lines[$i]='bt-tracker=' + $trackers; $replaced=$true } }; if($replaced){ [System.IO.File]::WriteAllLines($conf, $lines, $enc); Write-Host '[成功] Tracker 已原位更新完成。' -ForegroundColor Green } else { Write-Host '[警告] 未在 aria2.conf 中找到 bt-tracker= 配置行。' -ForegroundColor Yellow } } catch { Write-Host ('[错误] 替换失败，原因: ' + $_.Exception.Message) -ForegroundColor Red } } else { Write-Host '[错误] 未找到 aria2.conf 配置文件。' -ForegroundColor Red }"

:: 获取时间戳
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH.mm.ss"') do set "timestamp=%%i"


rem 重启aria2c服务(需要管理员权限)
sc stop "Aria2c-Local.exe"
timeout /t 2 >nul
move Aria2c_LOG.log Aria2c_LOG_%timestamp%.log
timeout /t 2 >nul
sc start "Aria2c-Local.exe"

del all_aria2.txt

exit