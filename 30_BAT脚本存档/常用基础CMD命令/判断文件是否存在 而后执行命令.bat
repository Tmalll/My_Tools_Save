@echo off
IF EXIST %temp%\#运行检测.tmp (

echo 同步任务正在进行，3秒后退出程序。
exit

) ELSE (

echo 检测到没有同步任务，3秒后开始同步工作。
exit

)
