@echo off

where ffmpeg >nul 2>nul || (echo [错误] 找不到 ffmpeg & pause & exit /b)
where ffprobe >nul 2>nul || (echo [错误] 找不到 ffprobe & pause & exit /b)

set "targetDir=%~dp0video2"
echo 正在处理路径: %targetDir%
echo 策略: 提取编码 ?? 规范命名 ?? 两阶段智能修复方案
echo -------------------------------------------------------------------------------

powershell -NoProfile -ExecutionPolicy Bypass -Command "$target = '%targetDir%'; $outDir = Join-Path $target 'fixed_videos'; if (-not (Test-Path $outDir)) { New-Item $outDir -ItemType Directory >$null }; Write-Host '>> 开始检测编码并修复视频...' -ForegroundColor Cyan; Get-ChildItem -Path $target -File | Where-Object { $_.Extension -match '^\.(mp4|mkv|avi|mov)$' } | ForEach-Object { $codec = (ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 $_.FullName); if ($codec) { $codec = $codec.Trim() } else { $codec = 'unknown' }; $newName = '{0}[{1}]{2}' -f $_.BaseName, $codec, $_.Extension; $outPath = Join-Path $outDir $newName; Write-Host ('[正在处理] ' + $_.Name + ' -> ' + $newName) -ForegroundColor Yellow; ffmpeg -y -i $_.FullName -c copy -movflags +faststart $outPath 2>$null; if (-not (Test-Path $outPath) -or (Get-Item $outPath).Length -le 100) { Write-Host '   [无损复制失败] 正在启用 libx264 强力转码挽救...' -ForegroundColor DarkYellow; ffmpeg -y -i $_.FullName -c:v libx264 -c:a aac -movflags +faststart $outPath 2>$null }; Start-Sleep -Milliseconds 200; if ((Test-Path $outPath) -and (Get-Item $outPath).Length -gt 100) { Write-Host '   [成功] 视频已完美修复！' -ForegroundColor Green } else { if (Test-Path $outPath) { Remove-Item $outPath -Force }; Write-Host '   [失败] 文件数据严重缺失，无法读取' -ForegroundColor Red } }"

echo -------------------------------------------------------------------------------
echo 处理完成！输出文件已存放在 [fixed_videos] 文件夹中。
pause