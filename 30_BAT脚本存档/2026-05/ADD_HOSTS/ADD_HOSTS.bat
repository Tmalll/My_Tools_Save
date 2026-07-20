@echo off
title Update Hosts (Step Debug v2)

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

set "HOSTS=%SystemRoot%\System32\drivers\etc\hosts"
set "ADD=%~dp0ADD_HOSTS.txt"
set "bakDIR=%~dp0"

if not exist "%ADD%" (
    echo 未找到 ADD_HOSTS.txt
    pause
    exit /b
)

echo [1/4] 正在备份 HOSTS 到指定目录
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ts=Get-Date -Format 'yyyyMMdd_HHmmss';$bakPath=Join-Path '%bakDIR%' ('hosts_'+$ts+'.bak');Copy-Item -Path '%HOSTS%' -Destination $bakPath -Force;Write-Host '备份完成: '$bakPath"
echo.
timeout /t 1 > NUL



echo [2/4] 正在注释去重...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$h=Get-Content '%HOSTS%' -Encoding String;$a=Get-Content '%ADD%' -Encoding String;$c=New-Object System.Collections.Generic.HashSet[string];foreach($l in $a){$t=$l.Trim();if($t.StartsWith('#') -and $t -ne ''){$null=$c.Add($t.ToLower())}};$out=@();foreach($l in $h){$k=$true;if($l.Trim().StartsWith('#')){if($c.Contains($l.Trim().ToLower())) {$k=$false}};if($k){$out+=$l}};[System.IO.File]::WriteAllLines('%HOSTS%', $out, [System.Text.Encoding]::Default);Write-Host '注释去重完成'"
echo.
timeout /t 1 > NUL


echo [3/4] 正在更新 HOSTS（域名去重+追加）...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$h=Get-Content '%HOSTS%' -Encoding String;$a=Get-Content '%ADD%' -Encoding String;$d=New-Object System.Collections.Generic.HashSet[string];foreach($l in $a){$t=$l.Trim();if($t -ne '' -and -not $t.StartsWith('#')){$p=$t -split '\s+';if($p.Count -ge 2){for($i=1;$i -lt $p.Count;$i++){$null=$d.Add($p[$i].ToLower())}}}};$new=@();foreach($l in $h){$k=$true;$t=$l.Trim();if($t -ne '' -and -not $t.StartsWith('#')){$p=$t -split '\s+';if($p.Count -ge 2){for($i=1;$i -lt $p.Count;$i++){if($d.Contains($p[$i].ToLower())) {$k=$false;break}}}};if($k){$new+=$l}};$res=$new+''+$a;[System.IO.File]::WriteAllLines('%HOSTS%', $res, [System.Text.Encoding]::Default);Write-Host '域名更新完成'"
echo.
timeout /t 1 > NUL


echo [4/4] 正在压缩空行...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$l=Get-Content '%HOSTS%' -Encoding String;$o=@();$b=0;foreach($i in $l){if([string]::IsNullOrWhiteSpace($i)){$b++;if($b -eq 1){$o+=$i}}else{$b=0;$o+=$i}};[System.IO.File]::WriteAllLines('%HOSTS%', $o, [System.Text.Encoding]::Default);Write-Host '全部任务完成'"
echo.
timeout /t 1 > NUL

echo    *** 正在刷新DNS ***
ipconfig /flushdns > NUL
echo.
timeout /t 1 > NUL


echo.
echo 完成
pause
exit


