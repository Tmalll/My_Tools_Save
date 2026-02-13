@echo off

:: 设置窗口大小
mode con: cols=80 lines=20

:: 关键修复：清屏并确保缓冲区重置完成
cls

:: 等待15秒
set SECONDS=15 & set interval_MS=10 & set skip_MS=3000 & set skip_min_Interval_MS=50

:: 修复说明：
:: 1. 增加了 $p = [Console]::CursorLeft, [Console]::CursorTop 记录起始坐标
:: 2. 在循环开头增加 [Console]::SetCursorPosition($p.Left, $p.Top) 强制回归原点
:: 3. 去掉了不稳定的 `r，改用物理坐标对齐，这样即便 mode 导致窗口抖动也绝不会刷屏
powershell -NoProfile -Command "$m=%SECONDS%*1000; $lastTick=0; $skipS = %skip_MS%/1000; $p = @{L=[Console]::CursorLeft; T=[Console]::CursorTop}; while($m -gt 0){ [Console]::SetCursorPosition($p.L, $p.Top); $display=[math]::Max($m/1000, 0); Write-Host -NoNewline (\"剩余 {0:F3} 秒后脚本继续... [点按空格跳过 {1:F1}s ^| 长按空格/Esc/回车 - 快速跳过]    \" -f $display, $skipS); if([Console]::KeyAvailable){ $key=[Console]::ReadKey($true); $nowTick=(Get-Date).Ticks; if($key.Key -eq 'Spacebar'){ if(($nowTick - $lastTick) -gt %skip_min_Interval_MS%0000){ $m-=%skip_MS%; $lastTick=$nowTick } } elseif($key.Key -eq 'Enter' -or $key.Key -eq 'Escape'){ break }; while([Console]::KeyAvailable){$null=[Console]::ReadKey($true)} }; Start-Sleep -Milliseconds %interval_MS%; $m-=%interval_MS% }; Write-Host ' '"

echo.
echo 计时器已经结束...
pathping -p 333 -q 1 localhost >nul