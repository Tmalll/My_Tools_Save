@echo off
set SECONDS=15
set interval_MS=10

powershell -NoProfile -Command "$m=%SECONDS%*1000; while($m -gt 0){ $display = [math]::Max($m/1000, 0); Write-Host -NoNewline (\"`r剩余 {0:F3} 秒后脚本继续... [空格-5s ^| Esc/回车-全跳过]   \" -f $display); if([Console]::KeyAvailable){ $key = [Console]::ReadKey($true); if($key.Key -eq 'Spacebar'){ $m-=5000 } elseif($key.Key -eq 'Enter' -or $key.Key -eq 'Escape'){ break }; do{} while([Console]::KeyAvailable) }; Start-Sleep -Milliseconds %interval_MS%; $m-=%interval_MS% }; Write-Host ' '"

echo.
echo 脚本已经执行...
pause