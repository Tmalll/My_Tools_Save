pause && pause && pause


:: ps单行版
powershell -Command "if (Get-Process 'Cobian.Reflector.UserInterface1' -ErrorAction SilentlyContinue) { Write-Host '[ Cobian Reflector UI ] 已经在运行' -ForegroundColor Green } else { Write-Host '未找到进程，将重新启动' -ForegroundColor Yellow; Start-Process 'C:\Program Files\Cobian Reflector\Cobian.Reflector.UserInterface.exe' }"


:: 脚本版
:: 设置进程名（不需要加 .exe）
set "PName=Cobian.Reflector.UserInterface"
:: 设置程序完整路径
set "PPath=C:\Program Files\Cobian Reflector\Cobian.Reflector.UserInterface.exe"
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-Process '%PName%' -ErrorAction SilentlyContinue) {  Write-Host '[ %PName% ] 已经在运行' -ForegroundColor Green; } else {  Write-Host '未找到进程，准备启动...' -ForegroundColor Yellow; Start-Process '%PPath%';  }"


:: tasklist 方案
tasklist /FI "IMAGENAME eq Cobian.Reflector.UserInterface.exe" /FO CSV | findstr /I "Cobian.Reflector.UserInterface.exe" >nul
if %ERRORLEVEL% equ 0 (
    echo [ Cobian Reflector UI ] 已经在运行
) else (
    echo 未找到进程，将重新启动它
)


:: wmic 方案 已经弃用
wmic process where "name='Cobian.Reflector.UserInterface.exe'" get name /format:list | findstr /I "Name=" >nul
if %ERRORLEVEL% equ 0 (
    echo [ Cobian Reflector UI ] 已经在运行
) else (
    echo 未找到进程，准备启动...
)



