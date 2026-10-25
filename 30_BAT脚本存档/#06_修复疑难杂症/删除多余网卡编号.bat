@echo off
pause
pause
pause

reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\NetworkList\Profiles" /f
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\NetworkList\Signatures" /f
echo 已经清除完成,  请确认是否重启计算机
echo 不重启请关闭此对话框

pause
pause
pause
shutdown.exe -r -t 5
exit


