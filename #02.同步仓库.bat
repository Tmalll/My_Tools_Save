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

pause
exit
