set SECONDS=10 & set interval_MS=100
powershell -NoProfile -Command "$s=%SECONDS%; $i=%interval_MS%; for($m=$s*1000; $m -gt 0; $m-=$i){ Write-Host -NoNewline (\"`r £”‡ {0:F3} √Î∫ÛΩ≈±æºÃ–¯...   \" -f ($m/1000)); Start-Sleep -Milliseconds $i }"
