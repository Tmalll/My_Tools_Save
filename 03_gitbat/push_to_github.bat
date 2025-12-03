@echo off

:: 仓库地址
set repo_addres=https://github.com/Tmalll/My-Tools-Template

:: 设置代理服务器
set http_proxy=socks5h://192.168.1.40:10800
set https_proxy=%http_proxy%
set HTTP_PROXY=%http_proxy%
set HTTPS_PROXY=%http_proxy%

:: 菜单选择器
:menu
echo ==========================================
echo 请选择同步方式:
echo [1] 普通更新 (不拉取，安全推送，不带 --force) 
echo [2] 同步更新 (先拉取远程，再安全推送，不带 --force，日常使用)
echo [3] 强制覆盖远程 (不拉取，带 --force)
echo [4] 彻底重置仓库 (删除.git，重新初始化并强制推送)
echo ==========================================
set /p choice=请输入数字(1-4): 

if "%choice%"=="1" goto 1_Normal_update
if "%choice%"=="2" goto 2_Sync_update
if "%choice%"=="3" goto 3_Force_update
if "%choice%"=="4" goto 4_Reset_repo

echo 输入错误，请输入 1-4
timeout /t 2 >nul
goto :menu

:: [1] 普通更新
:1_Normal_update
cd /d %~dp0
git add -A
git commit -m "update %date% %time%"
git push origin master

pause
goto :EOF

:: [2] 同步更新
:2_Sync_update
cd /d %~dp0
git fetch origin
git pull origin master
git add -A
git commit -m "sync update %date% %time%"
git push origin master

pause
goto :EOF

:: [3] 强制覆盖远程
:3_Force_update
cd /d %~dp0
git add -A
git commit -m "force override %date% %time%"
git push origin master --force

pause
goto :EOF

:: [4] 彻底重置仓库
:4_Reset_repo
cd /d %~dp0
rmdir /s /q .git

git init
git remote add origin %repo_addres%
git branch -M master

git add -A
git commit -m "initial clean commit %date% %time%"
git push origin master --force

pause
goto :EOF

pause
exit
