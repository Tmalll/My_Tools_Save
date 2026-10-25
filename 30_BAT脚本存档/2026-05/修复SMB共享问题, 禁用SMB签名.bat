@echo off
setlocal enabledelayedexpansion

echo 1. 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] 必须以管理员身份运行此脚本！
    echo 请右键点击此脚本，选择“以管理员身份运行”。
    pause
    exit /b
)

echo 2. 通过 PowerShell 强制修改 SMB 配置 (解决签名与协商问题)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-SmbClientConfiguration -EnableSecuritySignature $false -Force; Set-SmbClientConfiguration -RequireSecuritySignature $false -Force; Set-SmbClientConfiguration -EnableInsecureGuestLogons $true -Force"

echo 3. 补充注册表硬性降级 (双重保险)
echo [*] 正在写入注册表降级参数...
reg add "HKLM\System\CurrentControlSet\Services\LanmanWorkstation\Parameters" /v "RequireMessageSigning" /t REG_DWORD /d 0 /f >nul
reg add "HKLM\System\CurrentControlSet\Services\LanmanWorkstation\Parameters" /v "EnableSecuritySignature" /t REG_DWORD /d 0 /f >nul
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\LanmanWorkstation" /v "AllowInsecureGuestAuth" /t REG_DWORD /d 1 /f >nul

echo 4. 重启 Workstation 服务使之立即生效
echo.
echo [*] 正在重启网络相关服务...
net stop LanmanWorkstation /y
net start LanmanWorkstation

pause
exit


