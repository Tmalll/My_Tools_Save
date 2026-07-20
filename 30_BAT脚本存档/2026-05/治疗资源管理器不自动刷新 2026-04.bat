@echo off

echo.
echo 先运行此脚本, 清理 [C:\Users\%username%\AppData\Roaming\Microsoft\Windows\Recent\*.*] 
echo 这个是Windows历史记录和一些跳转项目.
echo 清理完后重启计算机...
echo 如果清理完还是不行, 则执行下面的命令修复系统.
echo.
echo.
echo 不含括号: [   sfc /scannow   ] 
echo.
echo.
echo 不含括号: [   Dism /Online /Cleanup-Image /RestoreHealth   ] 
echo.
echo.
echo *** *** 这会丢失任务栏固定程序的跳转记录! *** *** 
echo *** *** 这会丢失开始菜单的程序执行历史记录! *** *** 
echo.
echo 请确认继续执行脚本 3 , 清理 [ ...\Windows\Recent\*.* ]
pause
echo.
echo 请确认继续执行脚本 2 , 清理 [ ...\Windows\Recent\*.* ]
pause
echo.
echo 请确认继续执行脚本 1 (再按就开始了!), 清理 [ ...\Windows\Recent\*.* ]
pause



del /s /q /f /a C:\Users\%username%\AppData\Roaming\Microsoft\Windows\Recent\*.*
:: del /s /q /f /a C:\Users\%username%\AppData\Roaming\Microsoft\Windows\Recent\AutomaticDestinations\*.*
:: del /s /q /f /a C:\Users\%username%\AppData\Roaming\Microsoft\Windows\Recent\CustomDestinations\*.*



pause
exit
