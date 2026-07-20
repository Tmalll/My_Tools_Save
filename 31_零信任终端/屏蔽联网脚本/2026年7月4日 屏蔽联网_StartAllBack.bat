@echo off
title Block EXE Firewall Rules
setlocal EnableExtensions

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: 工作目录
set "TARGET_DIR=C:\Program Files\StartAllBack"

:: 定义规则名称
set "RULE_PREFIX=屏蔽联网_[StartAllBack]"

echo 清理防火墙规则: [ %RULE_PREFIX% ]
powershell -Command "Get-NetFirewallRule | Where-Object { $_.DisplayName -match [regex]::Escape('%RULE_PREFIX%') } | Remove-NetFirewallRule"
echo 当前规则: [ %RULE_PREFIX% ] 已清理...
echo.

echo 请确认继续添加防火墙阻止规则 3 ...
pause
echo 请确认继续添加防火墙阻止规则 2 ...
pause
echo 请确认继续添加防火墙阻止规则 1 ...
pause

:: ===== 检查目录 =====
if not exist "%TARGET_DIR%" (
    echo.
    echo [ERROR] Directory not found:
    echo %TARGET_DIR%
    echo.
    pause
    exit /b
)

echo.
echo =========================================
echo   Scan EXE and Block Firewall Access
echo =========================================
echo.
echo Target:
echo %TARGET_DIR%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "& {$base=(Resolve-Path '%TARGET_DIR%').Path;$prefix='%RULE_PREFIX%';$count=0;Write-Host '[CLEAN OLD RULES]';Get-NetFirewallRule | Where-Object {$_.DisplayName -match [regex]::Escape($prefix)} | Remove-NetFirewallRule;Get-ChildItem -Path $base -Recurse -File -Filter *.exe | %% {$path=$_.FullName;$rel=$path.Substring($base.Length).TrimStart('\');$safe=($rel -replace '[^a-zA-Z0-9_\-\.\u4e00-\u9fa5]','_');$nameOut=$prefix+'_OUT_'+$safe;$nameIn=$prefix+'_IN_'+$safe;Write-Host ('[BLOCK] '+$path);netsh advfirewall firewall add rule name=$nameOut dir=out action=block enable=yes profile=any program=$path >$null;netsh advfirewall firewall add rule name=$nameIn dir=in action=block enable=yes profile=any program=$path >$null;$count++};Write-Host '';Write-Host ('Done. Total EXE Blocked: '+$count)}"
echo.







pause
exit





















