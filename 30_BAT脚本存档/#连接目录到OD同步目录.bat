@echo off

set "target=E:\01.userData\ZhuoMian\10.同步盘\OneDrive_个人\wutongskype@live.com\OneDrive\06.CMD脚本"
set "被连接的目录=%~dp0"

echo 连接目标: [ %target% ]
echo 被连接的目录: [ %被连接的目录% ]

echo 确认是否执行? 3
pause
echo 确认是否执行? 2
pause
echo 确认是否执行? 1
pause



rmdir  /s /q  "%target%"

echo 连接配置
mklink /j  "%target%"  "%被连接的目录%"


pause
exit
