@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: 变量配置
:: ============================================================
:: 操作目录：使用 %~dp0 (末尾不带斜杠)
set "DEST_ROOT=%~dp0"
if "%DEST_ROOT:~-1%"=="\" set "DEST_ROOT=%DEST_ROOT:~0,-1%"

:: 备份文件夹前缀
set "bakName=DR2_Save_Bak"

:: 归档天数：7天前
set "DaysBack=7"

echo 正在扫描: "%DEST_ROOT%"
echo 目标前缀: %bakName%
echo 策略: 打包 %DaysBack% 天前的备份并计算日期区间...

:: ============================================================
:: 执行 PowerShell (单行逻辑：计算日期范围 -> 统一打包 -> 删除)
:: ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -Command "$today=(Get-Date).ToString('yyyy-MM-dd'); $limit=(Get-Date).AddDays(-%DaysBack%).Date; $items = Get-ChildItem -LiteralPath '%DEST_ROOT%' -Directory | Where-Object { $_.Name -like '%bakName%_????-??-??_*' }; $targets = $items | ForEach-Object { $dStr=$_.Name.Substring('%bakName%_'.Length, 10); try { $d=[DateTime]::ParseExact($dStr,'yyyy-MM-dd',$null); if($d -lt $limit){ [PSCustomObject]@{Obj=$_; Date=$d; DateStr=$dStr} } } catch{} } | Sort-Object Date; if($targets){ $minDate=$targets[0].DateStr; $maxDate=$targets[-1].DateStr; $zipName='%bakName%_' + $today + '_归档(' + $minDate + '_' + $maxDate + ').zip'; $zipPath=Join-Path '%DEST_ROOT%' $zipName; Write-Host ('归档范围: ' + $minDate + ' 至 ' + $maxDate) -ForegroundColor Cyan; Write-Host ('生成文件: ' + $zipName) -ForegroundColor Yellow; $targetPaths = $targets.Obj.FullName; Compress-Archive -Path $targetPaths -DestinationPath $zipPath -CompressionLevel Optimal; if($?){ $targets.Obj | Remove-Item -Recurse -Force; Write-Host '归档成功，源文件已清理。' -ForegroundColor Green } } else { Write-Host '未发现符合条件的旧备份文件夹。' -ForegroundColor Gray }"

echo.
echo 脚本执行完毕。
pause