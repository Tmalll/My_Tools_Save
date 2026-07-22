
set "运行脚本=E:\01.userData\ZhuoMian\工具存档\24_Rclone_同步脚本\04_备份_ZhuoMian_软件目录.bat"
set "日志文件=E:\01.userData\ZhuoMian\Rclone.log"

start /b /wait "" cmd /c ""%运行脚本%" > "%日志文件%" 2>&1"

pause
exit
