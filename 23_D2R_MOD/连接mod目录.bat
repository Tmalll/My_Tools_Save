@echo off

set "target=E:\01.userData\ZhuoMian\工具存档\23_D2R_MOD"
set "被连接的目录=%~dp0"

rmdir  /s /q  "%target%"

echo 连接配置
mklink /j  "%target%"  "%被连接的目录%"


pause
exit
