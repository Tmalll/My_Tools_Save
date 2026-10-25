@echo off
title Internet Explorer 禁用管理工具

:: 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 请右键选择“以管理员身份运行”本脚本！
    pause
    exit
)

:menu
cls
echo =====================================
echo       Internet Explorer 禁用管理
echo =====================================
echo.
echo 1. HKLM IFEO 禁用 (映像劫持)
echo 2. HKLM IFEO 恢复
echo.
echo 3. SRP 软件限制策略 禁用
echo 4. SRP 软件限制策略 恢复 (即时刷新)
echo.
echo 5. NTFS 权限 禁用 (自动夺权)
echo 6. NTFS 权限 恢复 (还原继承)
echo.
echo 7. 物理空包占位 禁用 (替换为0字节文件)
echo 8. 物理空包占位 恢复
echo.
echo 0. 退出
echo.

set /p choice=请选择:

if "%choice%"=="1" goto HKLM_IFEO_DISABLE
if "%choice%"=="2" goto HKLM_IFEO_ENABLE

if "%choice%"=="3" goto SRP_DISABLE
if "%choice%"=="4" goto SRP_ENABLE

if "%choice%"=="5" goto NTFS_DISABLE
if "%choice%"=="6" goto NTFS_ENABLE

if "%choice%"=="7" goto DUMMY_DISABLE
if "%choice%"=="8" goto DUMMY_ENABLE

if "%choice%"=="0" exit

goto menu


:HKLM_IFEO_DISABLE
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\iexplore.exe" /v Debugger /t REG_SZ /d "C:\Windows\System32\ie_disabled.exe" /f
echo.
echo HKLM IFEO 已禁用
pause
goto menu


:HKLM_IFEO_ENABLE
reg delete "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\iexplore.exe" /f
echo.
echo HKLM IFEO 已恢复
pause
goto menu


:SRP_DISABLE
echo 配置 SRP 限制策略...
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers" /v TransparentEnabled /t REG_DWORD /d 1 /f
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers" /v DefaultLevel /t REG_DWORD /d 262144 /f
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers\0\Paths\{A1111111-1111-1111-1111-111111111111}" /v ItemData /t REG_SZ /d "C:\Program Files\Internet Explorer\iexplore.exe" /f
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers\0\Paths\{A2222222-2222-2222-2222-222222222222}" /v ItemData /t REG_SZ /d "C:\Program Files (x86)\Internet Explorer\iexplore.exe" /f
gpupdate /force >nul 2>&1
echo.
echo SRP 策略已配置生效
pause
goto menu


:SRP_ENABLE
echo 正在清理 SRP 策略...
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers\0\Paths\{A1111111-1111-1111-1111-111111111111}" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers\0\Paths\{A2222222-2222-2222-2222-222222222222}" /f >nul 2>&1
gpupdate /force >nul 2>&1
taskkill /f /im explorer.exe >nul 2>&1
start explorer.exe
echo.
echo SRP 策略已恢复，已自动刷新系统桌面缓存。
pause
goto menu


:NTFS_DISABLE
echo 正在获取文件所有权并设置 NTFS 拒绝访问...

if not exist "C:\Program Files\Internet Explorer\iexplore.exe" goto SKIP_IE64
takeown /f "C:\Program Files\Internet Explorer\iexplore.exe" /a >nul
icacls "C:\Program Files\Internet Explorer\iexplore.exe" /grant Administrators:F >nul
icacls "C:\Program Files\Internet Explorer\iexplore.exe" /deny Everyone:(RX) >nul

:SKIP_IE64
if not exist "C:\Program Files (x86)\Internet Explorer\iexplore.exe" goto SKIP_IE32
takeown /f "C:\Program Files (x86)\Internet Explorer\iexplore.exe" /a >nul
icacls "C:\Program Files (x86)\Internet Explorer\iexplore.exe" /grant Administrators:F >nul
icacls "C:\Program Files (x86)\Internet Explorer\iexplore.exe" /deny Everyone:(RX) >nul

:SKIP_IE32
echo.
echo NTFS 权限配置完成，已对所有用户拒绝执行权限。
pause
goto menu


:NTFS_ENABLE
echo 正在恢复 NTFS 默认权限...

if not exist "C:\Program Files\Internet Explorer\iexplore.exe" goto SKIP_RESTORE_IE64
icacls "C:\Program Files\Internet Explorer\iexplore.exe" /remove:d Everyone >nul
icacls "C:\Program Files\Internet Explorer\iexplore.exe" /reset >nul

:SKIP_RESTORE_IE64
if not exist "C:\Program Files (x86)\Internet Explorer\iexplore.exe" goto SKIP_RESTORE_IE32
icacls "C:\Program Files (x86)\Internet Explorer\iexplore.exe" /remove:d Everyone >nul
icacls "C:\Program Files (x86)\Internet Explorer\iexplore.exe" /reset >nul

:SKIP_RESTORE_IE32
echo.
echo NTFS 权限已恢复默认
pause
goto menu


:DUMMY_DISABLE
echo 正在备份原文件并用 0 字节空文件替换...

if not exist "C:\Program Files\Internet Explorer\iexplore.exe" goto DUMMY_IE32
takeown /f "C:\Program Files\Internet Explorer\iexplore.exe" /a >nul
icacls "C:\Program Files\Internet Explorer\iexplore.exe" /grant Administrators:F >nul
if not exist "C:\Program Files\Internet Explorer\iexplore.exe.bak" (
    ren "C:\Program Files\Internet Explorer\iexplore.exe" "iexplore.exe.bak"
) else (
    del /f /q "C:\Program Files\Internet Explorer\iexplore.exe" >nul 2>&1
)
type nul > "C:\Program Files\Internet Explorer\iexplore.exe"
icacls "C:\Program Files\Internet Explorer\iexplore.exe" /deny Everyone:(F) >nul

:DUMMY_IE32
if not exist "C:\Program Files (x86)\Internet Explorer\iexplore.exe" goto DUMMY_END
takeown /f "C:\Program Files (x86)\Internet Explorer\iexplore.exe" /a >nul
icacls "C:\Program Files (x86)\Internet Explorer\iexplore.exe" /grant Administrators:F >nul
if not exist "C:\Program Files (x86)\Internet Explorer\iexplore.exe.bak" (
    ren "C:\Program Files (x86)\Internet Explorer\iexplore.exe" "iexplore.exe.bak"
) else (
    del /f /q "C:\Program Files (x86)\Internet Explorer\iexplore.exe" >nul 2>&1
)
type nul > "C:\Program Files (x86)\Internet Explorer\iexplore.exe"
icacls "C:\Program Files (x86)\Internet Explorer\iexplore.exe" /deny Everyone:(F) >nul

:DUMMY_END
echo.
echo 空包占位完成！已锁定空文件权限。
pause
goto menu


:DUMMY_ENABLE
echo 正在还原原版 iexplore.exe 文件...

if exist "C:\Program Files\Internet Explorer\iexplore.exe.bak" (
    icacls "C:\Program Files\Internet Explorer\iexplore.exe" /remove:d Everyone >nul 2>&1
    del /f /q "C:\Program Files\Internet Explorer\iexplore.exe" >nul 2>&1
    ren "C:\Program Files\Internet Explorer\iexplore.exe.bak" "iexplore.exe"
    icacls "C:\Program Files\Internet Explorer\iexplore.exe" /reset >nul
)

if exist "C:\Program Files (x86)\Internet Explorer\iexplore.exe.bak" (
    icacls "C:\Program Files (x86)\Internet Explorer\iexplore.exe" /remove:d Everyone >nul 2>&1
    del /f /q "C:\Program Files (x86)\Internet Explorer\iexplore.exe" >nul 2>&1
    ren "C:\Program Files (x86)\Internet Explorer\iexplore.exe.bak" "iexplore.exe"
    icacls "C:\Program Files (x86)\Internet Explorer\iexplore.exe" /reset >nul
)

echo.
echo 已恢复原版 iexplore.exe 文件。
pause
goto menu