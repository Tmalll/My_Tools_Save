@echo off
:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% == 0 (
    echo 正在修复 CredSSP 远程桌面报错...
) else (
    echo 请右键点击此脚本，选择“以管理员身份运行”！
    pause
    exit
)

:: 定义注册表路径
set "REG_PATH=HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\System\CredSSP\Parameters"

:: 强制创建路径并添加/修改键值
:: 0x2 代表“易受攻击 (Vulnerable)”，允许不同补丁级别的机器连接
reg add "%REG_PATH%" /v AllowEncryptionOracle /t REG_DWORD /d 2 /f

echo.
if %errorLevel% == 0 (
    echo [成功] 注册表项已更新。
    echo 现在请重新尝试远程桌面连接。
) else (
    echo [失败] 修改注册表时出错。
)

pause