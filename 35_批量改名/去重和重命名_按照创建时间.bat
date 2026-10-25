@echo off
setlocal
set "targetDir=%~dp0video"
if not exist "%targetDir%" (echo [错误] 找不到文件夹: %targetDir% & pause & exit /b)
echo 正在处理路径: %targetDir%
echo 策略: 新优先去重 / 毫秒重命名 [yyyy-MM-dd_HH.mm.ss_毫秒.原后缀]
echo -------------------------------------------------------------------------------
powershell -NoProfile -ExecutionPolicy Bypass -Command "$target = '%targetDir%'; $hashTable = @{}; Write-Host '>> 步骤 1: 正在从新到旧扫描并去重...' -ForegroundColor Cyan; Get-ChildItem -Path $target -File | Sort-Object LastWriteTime -Descending | ForEach-Object { $hash = (Get-FileHash $_.FullName -Algorithm MD5).Hash; if ($hashTable.ContainsKey($hash)) { Write-Host ('[删除重复] ' + $_.Name) -ForegroundColor Gray; Remove-Item $_.FullName -Force } else { $hashTable[$hash] = $_.Name } }; Write-Host '>> 步骤 2: 正在按真实毫秒重命名...' -ForegroundColor Cyan; Get-ChildItem -Path $target -File | Sort-Object LastWriteTime -Descending | ForEach-Object { $ms = $_.LastWriteTime.ToString('fff'); $baseTime = $_.LastWriteTime.ToString('yyyy-MM-dd_HH.mm.ss'); $ext = $_.Extension; $newName = '{0}_{1}{2}' -f $baseTime, $ms, $ext; $finalPath = Join-Path $target $newName; if (Test-Path $finalPath) { $subCount = 1; while (Test-Path $finalPath) { if ($_.Name -eq $newName) { break }; $newName = '{0}_{1}+{2}{3}' -f $baseTime, $ms, $subCount, $ext; $finalPath = Join-Path $target $newName; $subCount++ } }; if ($_.Name -ne $newName) { Write-Host ('[重命名] ' + $_.Name + ' -> ' + $newName) -ForegroundColor Green; Rename-Item $_.FullName -NewName $newName } }"
echo -------------------------------------------------------------------------------
echo 处理完成！
pause