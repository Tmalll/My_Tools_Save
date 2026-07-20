@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: 设置变量
:: ============================================================
set "DEST_ROOT=%~dp0"
if "%DEST_ROOT:~-1%"=="\" set "DEST_ROOT=%DEST_ROOT:~0,-1%"

set "bakName=DR2_Save_Bak"
set "DaysBack=7"

echo 正在处理: "%DEST_ROOT%"
echo 策略: 提取文件夹名日期，打包 %DaysBack% 天前的备份...

:: ============================================================
:: 执行 PowerShell (全单行版，无换行符，无 ^ 干扰)
:: ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -Command "$limit=(Get-Date).AddDays(-%DaysBack%).Date; Get-ChildItem -LiteralPath '%DEST_ROOT%' -Directory | Where-Object { $_.Name -like '%bakName%_????-??-??_*' } | ForEach-Object { $dStr=$_.Name.Substring('%bakName%_'.Length, 10); try { $d=[DateTime]::ParseExact($dStr,'yyyy-MM-dd',$null); if($d -lt $limit){ $zName='%bakName%_'+$dStr+'.zip'; $zPath=Join-Path '%DEST_ROOT%' $zName; Write-Host ('正在打包: '+$_.Name) -ForegroundColor Yellow; Compress-Archive -LiteralPath $_.FullName -Update -DestinationPath $zPath -CompressionLevel Optimal; if($?){ Remove-Item -LiteralPath $_.FullName -Recurse -Force } } } catch{} }"

echo.
echo 任务执行完毕。
pause