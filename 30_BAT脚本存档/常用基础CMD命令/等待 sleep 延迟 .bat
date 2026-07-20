pause
pause
pause

set SECONDS=15 & set interval_MS=10 & set skip_MS=3000 & set skip_min_Interval_MS=50
powershell -NoProfile -Command "$m=%SECONDS%*1000;$skipS=%skip_MS%/1000;$lastTick=0;$line=[Console]::CursorTop;while($m -gt 0){[Console]::SetCursorPosition(0,$line);$display=[math]::Max($m/1000,0);Write-Host -NoNewline ('剩余 {0,6:F3} 秒后继续... [空格跳过 {1:F1}s ^| Enter/Esc 立即跳过]   ' -f $display,$skipS);if([Console]::KeyAvailable){$key=[Console]::ReadKey($true);$now=(Get-Date).Ticks;if($key.Key -eq 'Spacebar'){if(($now-$lastTick) -gt %skip_min_interval_MS%0000){$m-=%skip_MS%;$lastTick=$now}}elseif($key.Key -in 'Enter','Escape'){break};while([Console]::KeyAvailable){$null=[Console]::ReadKey($true)}};Start-Sleep -Milliseconds %interval_MS%;$m-=%interval_MS%};[Console]::SetCursorPosition(0,$line);Write-Host '延迟结束，开始执行脚本...'"


powershell版本计时器
set SECONDS=10 & set interval_MS=100
powershell -NoProfile -Command "$s=%SECONDS%; $i=%interval_MS%; for($m=$s*1000; $m -gt 0; $m-=$i){ Write-Host -NoNewline (\"`r剩余 {0:F3} 秒后脚本继续...   \" -f ($m/1000)); Start-Sleep -Milliseconds $i }"




毫秒级
ping 10.6.6.6 -n 1 -w 100 > nul

powershell -NoProfile -Command "Start-Sleep -Milliseconds 200"
pathping -p 333 -q 1 localhost >nul
powershell -NoProfile -Command "sleep -m 200"


秒级
timeout /t 5 >nul
choice /c y /n /d y /t 1 >nul


:: 忽略除 Ctrl+C 以外的所有按键
timeout /t 15 /nobreak >nul


