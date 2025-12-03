编码
powershell Measure-Command { openssl base64 -A -in 5120m -out 5120m.b64 }

解码
powershell Measure-Command { openssl base64 -d -A -in 5120m.base64 -out 5120m.out  }




for /f %T in ('powershell -NoProfile -Command "[int64](Get-Date).ToUniversalTime().Ticks/10000"') do set startTime=%T
openssl base64 -A -in 5120m -out 5120m.b64
powershell -NoProfile -Command "$elapsed=[int64](Get-Date).ToUniversalTime().Ticks/10000 - %startTime%; Write-Host ('总计耗时 {0:F3} 秒' -f ($elapsed/1000.0))"

测试后速度比较慢, 和powershell差不多, 放弃 !



