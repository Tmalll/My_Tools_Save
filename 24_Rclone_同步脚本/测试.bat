
set "运行脚本=E:\01.userData\ZhuoMian\工具存档\24_rclone_windows_本地同步备份脚本\03_备份_Github仓库_.bat"
set "日志文件=E:\01.userData\ZhuoMian\Rclone.log"

start /b /wait "" cmd /c ""%运行脚本%" > "%日志文件%" 2>&1"

pause
exit
