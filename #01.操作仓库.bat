@echo off
echo.

:: 设置用户名 - 这个一般不用改
set UserName=Tmalll
echo 当前用户名为: [ %UserName% ]

:: 设置仓库名称 - 创建和其他
set REPO_NAME=My_Tools_Save
echo 当前仓库名为: [ %REPO_NAME% ]

:: 仓库地址
set repo_addres=https://github.com/%UserName%/%REPO_NAME%
echo 当前仓库地址为: [ %repo_addres% ]


:: 改名 - 现在的仓库名
set NowName=My_Tools_Save
echo 现在的仓库名为: [ %NowName% ]

:: 改名 - 要修改的目标名称 - 手动设定
set ToName=MosDNS_v3
echo 要修改的目标仓库名为: [ %ToName% ]


:: 设置代理服务器
set http_proxy=socks5h://192.168.1.40:10800
set https_proxy=%http_proxy%
set HTTP_PROXY=%http_proxy%
set HTTPS_PROXY=%http_proxy%
echo 使用的HTTP代理为: [ %http_proxy% ]

:: curl -IL https://www.google.com -vv
:: pause



:: 菜单选择器
:menu
echo ==========================================
echo 请选择同步方式:
echo [1] 普通更新 ( 不拉取，安全推送，不带 --force ) 
echo [2] 同步更新 ( 先拉取远程，再安全推送，不带 --force，日常使用 )
echo [3] 强制覆盖远程 ( 不拉取，带 --force )
echo [4] 彻底重置仓库 ( 删除.git，重新初始化并强制推送 )
echo [5] 新建仓库 ( 把脚本所在目录新建为仓库, 并且初始化 )
echo [6] 修改仓库名称 ( 注意上面的变量设置 )
echo ==========================================
set /p choice=请输入数字(1-6): 

if "%choice%"=="1" goto 1_Normal_update
if "%choice%"=="2" goto 2_Sync_update
if "%choice%"=="3" goto 3_Force_update
if "%choice%"=="4" goto 4_Reset_repo
if "%choice%"=="5" goto 5_create
if "%choice%"=="6" goto 6_rename


echo 输入错误，请输入 1-6
timeout /t 2 >nul
goto :menu

:: [1] 普通更新
:1_Normal_update
cd /d %~dp0
git add -A
git commit -m "update %date% %time%"
git push origin main

echo 普通更新 - 完成！
pause
goto :EOF

:: [2] 同步更新
:2_Sync_update
cd /d %~dp0
git fetch origin
git pull origin main
git add -A
git commit -m "sync update %date% %time%"
git push origin main

echo 同步更新 - 完成！
pause
goto :EOF

:: [3] 强制覆盖远程
:3_Force_update
cd /d %~dp0
git add -A
git commit -m "force override %date% %time%"
git push origin main --force

echo 强制覆盖远程 - 完成！
pause
goto :EOF

:: [4] 彻底重置仓库
:4_Reset_repo
cd /d %~dp0
rmdir /s /q .git

git init
git remote add origin %repo_addres%
git branch -M main

git add -A
git commit -m "initial clean commit %date% %time%"
git push origin main --force

echo 彻底重置仓库 - 完成！
pause
goto :EOF



:5_create
cd /d %~dp0

:: 创建 GitHub 公共仓库
echo 正在创建 GitHub 公共仓库: %REPO_NAME%
gh repo create %REPO_NAME% --public --confirm

:: 初始化仓库
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/%UserName%/%REPO_NAME%.git
git push -u origin main

REM 推送并检查是否成功
git push -u origin main
if %ERRORLEVEL% EQU 0 (
    echo.
    echo 项目地址:
    git remote get-url origin
    echo.
)

echo 创建 GitHub 公共仓库 - 完成！
pause
goto :EOF



:6_rename
:: 修改 GitHub 仓库名
gh api -X PATCH -H "Accept: application/vnd.github+json" /repos/%UserName%/%NowName% -F name=%ToName%

:: 在你的本地仓库中更新远程地址
cd %~dp0
git remote set-url origin https://github.com/Tmalll/%ToName%.git

:: 测试推送
git push

:: 确认
git remote -v

echo 修改 GitHub 仓库名 - 完成！
pause
goto :EOF




pause
exit
