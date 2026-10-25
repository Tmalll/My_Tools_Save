@echo off
echo 正在扫描视频并提取 YouTube 下载地址，请稍候...

set "BaseFileName=outlink.txt"

powershell -NoProfile -Command "$scriptDir = '%~dp0'; $baseSuffix = '%BaseFileName%'; (Get-ChildItem -LiteralPath $scriptDir -Recurse -File) | ForEach-Object { $file = $_; $base = $file.BaseName; if ($base -match '\[([a-zA-Z0-9_-]{11})\]') { $vid = $Matches[1]; $url = 'https://www.youtube.com/watch?v=' + $vid; $parentName = $file.Directory.Name; $outName = $parentName + '_' + $baseSuffix; $outputFile = Join-Path $scriptDir $outName; Add-Content -LiteralPath $outputFile -Value $url; Write-Host ('[已提取到 ' + $outName + ']: ' + $file.Name) -ForegroundColor Green } }; Write-Host '全部提取完成！所有txt文件已统一生成在脚本所在目录。' -ForegroundColor Cyan; Write-Host '处理完成！' -ForegroundColor Yellow"

echo.
pause