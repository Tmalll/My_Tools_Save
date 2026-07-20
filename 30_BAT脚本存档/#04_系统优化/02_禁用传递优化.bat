
:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)



:: 1. 停止传递优化服务
:: net stop DoSvc
:: 2. 将传递优化服务设置为“禁用”
:: sc config DoSvc start= disabled :: 这个命令运行报错, 改成注册表的方式禁用.
:: reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\DoSvc" /v Start /t REG_DWORD /d 4 /f
:: 这个服务不能禁用了, 禁用了会导致 下载错误 - 0x80004002 无法下载更新包...

:: 3. 通过注册表彻底关闭传递优化的 P2P 分享和下载功能（DODownloadMode=0）
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization" /v DODownloadMode /t REG_DWORD /d 0 /f


echo 确定是否删除缓存, 可能造成奇怪的问题, 不建议经常清理... 3
pause
echo 确定是否删除缓存, 可能造成奇怪的问题, 不建议经常清理... 2
pause
echo 确定是否删除缓存, 可能造成奇怪的问题, 不建议经常清理... 1
pause


:: 强行删除传递优化的本地缓存文件夹及所有内容
net stop dosvc
net stop bits
net stop wuauserv

rmdir /s /q "%PROGRAMDATA%\Microsoft\Network\Downloader" >nul 2>&1
rmdir /s /q "%WINDIR%\ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\DeliveryOptimization\Cache" >nul 2>&1

net start dosvc
net start bits
net start wuauserv


pause
exit

