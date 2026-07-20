:Opera_Browser
set PRName=opera.exe

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