@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: 变量配置
:: ============================================================
:: 操作目录使用当前目录
set "DEST_ROOT=%~dp0"
if "%DEST_ROOT:~-1%"=="\" set "DEST_ROOT=%DEST_ROOT:~0,-1%"

set "bakName=DR2_Save_Bak"
set "DaysBack=7"
set "rarPath=C:\Program Files\WinRAR\Rar.exe"

echo 正在归档旧备份，请稍候...

:: ============================================================
:: 执行 PowerShell (精简静默版)
:: ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -Command "$today=(Get-Date).ToString('yyyy-MM-dd'); $limit=(Get-Date).AddDays(-%DaysBack%).Date; $items = Get-ChildItem -LiteralPath '%DEST_ROOT%' -Directory | Where-Object { $_.Name -like '%bakName%_????-??-??_*' }; $targets = $items | ForEach-Object { $dStr=$_.Name.Substring('%bakName%_'.Length, 10); try { $d=[DateTime]::ParseExact($dStr,'yyyy-MM-dd',$null); if($d -lt $limit){ [PSCustomObject]@{Obj=$_; Date=$d; DateStr=$dStr} } } catch{} } | Sort-Object Date; if($targets){ $minDate=$targets[0].DateStr; $maxDate=$targets[-1].DateStr; $rarName='%bakName%_' + $today + '_归档(' + $minDate + '_' + $maxDate + ').rar'; $rarFullPath = Join-Path '%DEST_ROOT%' $rarName; $listFile = Join-Path $env:TEMP 'rar_list.txt'; $targets.Obj.FullName | Out-File $listFile -Encoding Default; Write-Host ('生成归档: ' + $rarName) -ForegroundColor Green; & '%rarPath%' a -m1 -tl -htb -oc -df -k -ep1 -inul \"$rarFullPath\" \"@$listFile\"; if($?){ Remove-Item $listFile } } else { Write-Host '无符合条件的旧备份。' -ForegroundColor Gray }"

echo 任务完成。
pause

timeout /t 3 >nul