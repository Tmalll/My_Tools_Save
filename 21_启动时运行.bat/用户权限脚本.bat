@echo off
:: 最小化窗口
cd /d "%~dp0" & title %~nx0
if "%1" neq "min" start /min "" "%~f0" min & exit
:start_script
:: 这下面放最小化之后的脚本...
echo. & timeout /t 2 >nul & echo.

:原版Chrome
set "PRName=chrome.exe"
set "FullPath=D:\01.Program_Soft\01-浏览器\02.Chrome\Chrome\chrome.exe"
echo 隐藏启动 [ %FullPath% ] - 开始

:: FullPath 检测的版本
powershell -Command "$p = Get-Process | Where-Object { $_.Path -eq '%FullPath%' }; if (-not $p) { exit 1 }" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [ %PRName% ] 已经在运行, 启动程序 [ 跳过 ] ...
    echo.
) else (
    echo 未找到 [ %PRName% ] 进程，将 [ 重新启动它 ] ...
    start   ""   "%FullPath%" --no-startup-window

    echo.
)
echo. & timeout /t 2 >nul & echo.

:Cent_Browser_New_5.1
set "PRName=chrome.exe"
set "FullPath=D:\01.Program_Soft\01-浏览器\01.CentBrowser\New_5.1.1130.129_x64_portable\chrome.exe"
echo 隐藏启动 [ %FullPath% ] - 开始

:: FullPath 检测的版本
powershell -Command "$p = Get-Process | Where-Object { $_.Path -eq '%FullPath%' }; if (-not $p) { exit 1 }" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [ %PRName% ] 已经在运行, 启动程序 [ 跳过 ] ...
    echo.
) else (
    echo 未找到 [ %PRName% ] 进程，将 [ 重新启动它 ] ...
    start   ""   "%FullPath%" --no-startup-window

    echo.
)
echo. & timeout /t 2 >nul & echo.

:catsxp.exe
set PRName=catsxp.exe
echo 隐藏启动 [ %PRName% ] - 开始

tasklist /FI "IMAGENAME eq %PRName%" /FO CSV | findstr /I "%PRName%" >nul
if %ERRORLEVEL% equ 0 (
    echo [ %PRName% ] 已经在运行, 启动程序 [ 跳过 ] ...
    echo.
) else (
    echo 未找到 [ %PRName% ] 进程，将 [ 重新启动它 ] ...
    start   ""   "D:\01.Program_Soft\01-浏览器\05.catsxp\Bin\catsxp.exe" --no-startup-window
    echo.
)
echo. & timeout /t 2 >nul & echo.

:msedge.exe
set PRName=msedge.exe
echo 隐藏启动 [ %PRName% ] - 开始

tasklist /FI "IMAGENAME eq %PRName%" /FO CSV | findstr /I "%PRName%" >nul
if %ERRORLEVEL% equ 0 (
    echo [ %PRName% ] 已经在运行, 启动程序 [ 跳过 ] ...
    echo.
) else (
    echo 未找到 [ %PRName% ] 进程，将 [ 重新启动它 ] ...
    start   ""   "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --no-startup-window

    echo.
)
echo. & timeout /t 2 >nul & echo.

:Brave_browser
set PRName=brave.exe
echo 隐藏启动 [ %PRName% ] - 开始

tasklist /FI "IMAGENAME eq %PRName%" /FO CSV | findstr /I "%PRName%" >nul
if %ERRORLEVEL% equ 0 (
    echo [ %PRName% ] 已经在运行, 启动程序 [ 跳过 ] ...
    echo.
) else (
    echo 未找到 [ %PRName% ] 进程，将 [ 重新启动它 ] ...
    start   ""   "D:\01.Program_Soft\01-浏览器\06.brave\bin\brave.exe" --no-startup-window

    echo.
)
echo. & timeout /t 2 >nul & echo.

:Telegram.exe
set PRName=Telegram.exe
echo 隐藏启动 [ %PRName% ] - 开始

tasklist /FI "IMAGENAME eq %PRName%" /FO CSV | findstr /I "%PRName%" >nul
if %ERRORLEVEL% equ 0 (
    echo [ %PRName% ] 已经在运行, 启动程序 [ 跳过 ] ...
    echo.
) else (
    echo 未找到 [ %PRName% ] 进程，将 [ 重新启动它 ] ...
    start   ""   "D:\01.Program_Soft\Telegram\Bin\Telegram.exe" -startintray
    echo.
)
echo. & timeout /t 2 >nul & echo.

:Foxmail.exe
set "PRName=Foxmail.exe"
set "PRPath=D:\01.Program_Soft\12-eMail_Client\Foxmail\Foxmail.exe"
echo 隐藏启动 [ %PRName% ] - 开始
:: 1. 获取系统运行秒数
for /f %%i in ('powershell -NoProfile -Command "[int]((Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime).TotalSeconds"') do set "uptime=%%i"
:: 2. 逻辑判断, 开机时间小于3600秒, 并且已经启动, 则跳过, 否则重启它.
if %uptime% LSS 3600 (
    echo 当前系统运行时间仅为 [ %uptime% ] 秒...
    tasklist /FI "IMAGENAME eq %PRName%" /FO CSV | findstr /I "%PRName%" >nul
    if %ERRORLEVEL% equ 0 (
        echo [ %PRName% ] 已经在运行, 启动程序 [ 跳过 ] ...
        echo.
        goto :Foxmail_END
    ) else (
        echo 未找到 [ %PRName% ] 进程，将 [ 重新启动它 ] ...
        start "" "%PRPath%" -min
        echo [ %PRName% ] 重启完成
        echo.
        goto :Foxmail_END
    )
)
:: 3. 启动时间大于3600秒, 执行重度自愈（杀进程重开）
echo 系统运行时间已达 [ %uptime% ] 秒, 执行 [ %PRName% ] [ 强制重启 ] ...
taskkill /f /t /im %PRName% >nul 2>&1
pathping -p 2500 -q 1 localhost >nul
taskkill /f /t /im %PRName% >nul 2>&1
pathping -p 2500 -q 1 localhost >nul
start "" "%PRPath%" -min
echo [ %PRName% ] [ 强制重启 ] [ 完成 ] ...
echo.
:Foxmail_END
echo. & timeout /t 2 >nul & echo.

:Opera_Browser
set PRName=opera.exe
echo 隐藏启动 [ %PRName% ] - 开始

tasklist /FI "IMAGENAME eq %PRName%" /FO CSV | findstr /I "%PRName%" >nul
if %ERRORLEVEL% equ 0 (
    echo [ %PRName% ] 已经在运行, 启动程序 [ 跳过 ] ...
    echo.
) else (
    echo 未找到 [ %PRName% ] 进程，将 [ 重新启动它 ] ...
    start /min   ""   "D:\01.Program_Soft\01-浏览器\07.Opera\OperaPortable\opera_隐藏运行.bat"

    echo.
)
echo. & timeout /t 2 >nul & echo.

:Iceweasel.exe
set PRName=Iceweasel.exe
echo 隐藏启动 [ %PRName% ] - 开始

tasklist /FI "IMAGENAME eq %PRName%" /FO CSV | findstr /I "%PRName%" >nul
if %ERRORLEVEL% equ 0 (
    echo [ %PRName% ] 已经在运行, 启动程序 [ 跳过 ] ...
    echo.
) else (
    echo 未找到 [ %PRName% ] 进程，将 [ 重新启动它 ] ...
    start /min   ""   "D:\01.Program_Soft\01-浏览器\03.Firefox\Iceweasel_FirefoxPlus\Iceweasel_x64\Iceweasel_隐藏运行.bat"
    echo.
)
echo. & timeout /t 2 >nul & echo.


echo.
echo ... 后续其他脚本 ...
echo.






goto END_Exit

:END_Exit
echo.
echo.
echo 脚本运行完毕30秒后关闭本窗口...
timeout /t 5 && timeout /t 5 && timeout /t 5
timeout /t 5 && timeout /t 5 && timeout /t 5

exit






