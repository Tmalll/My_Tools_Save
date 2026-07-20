@echo off

:: 最小化窗口
cd /d "%~dp0" & title %~nx0
if "%1" neq "min" start /min "" "%~f0" min & exit
:start_script
echo. timeout /t 15 >nul & echo.
:: 这下面放最小化之后的脚本...






:官方版Chrome
set "PRName=官方版Chrome"
set "FullPath=D:\01.Program_Soft\01-浏览器\02.GoogleChrome\Chrome-bin\chrome.exe"

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
set "PRName=Cent_Browser_New_5.1"
set "FullPath=D:\01.Program_Soft\01-浏览器\01.CentBrowser\New_5.1.1130.129_x64_portable\chrome.exe"

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



:msedge.exe
set PRName=msedge.exe

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







:END_Exit
echo.
echo.
echo 脚本运行完毕30秒后关闭本窗口...
timeout /t 5 && timeout /t 5 && timeout /t 5
timeout /t 5 && timeout /t 5 && timeout /t 5
exit





:catsxp.exe
set PRName=catsxp.exe

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





:Iceweasel.exe
set PRName=Iceweasel.exe

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

:启动_Vivaldi
set "PRName=Vivaldi"
set "FullPath=D:\01.Program_Soft\01-浏览器\08.vivaldi\Vivaldi-bin\vivaldi.exe"

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


























