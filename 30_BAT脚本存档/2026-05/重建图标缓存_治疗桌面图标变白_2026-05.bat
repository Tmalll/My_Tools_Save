@echo off
taskkill /f /im explorer.exe
timeout /t 2

attrib -h -s -r "%userprofile%\AppData\Local\IconCache.db"
del /f /q "%userprofile%\AppData\Local\IconCache.db"

attrib /s /d -h -s -r "%userprofile%\AppData\Local\Microsoft\Windows\Explorer\*"
del /f /s /q "%userprofile%\AppData\Local\Microsoft\Windows\Explorer\thumbcache_*.db"
del /f /s /q "%userprofile%\AppData\Local\Microsoft\Windows\Explorer\iconcache_*.db"


timeout /t 2
start explorer.exe








pause
exit





