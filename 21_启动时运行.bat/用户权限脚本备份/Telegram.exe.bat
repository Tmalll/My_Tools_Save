:Telegram.exe
set PRName=Telegram.exe
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