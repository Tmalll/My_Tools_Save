:Foxmail.exe
set "PRName=Foxmail.exe"
set "PRPath=D:\01.Program_Soft\12-eMail_Client\Foxmail\Foxmail.exe"
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