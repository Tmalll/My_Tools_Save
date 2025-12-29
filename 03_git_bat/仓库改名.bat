@echo off
echo 请核对要修改的信息.
pause
echo 请核对要修改的信息.
pause
echo 请核对要修改的信息.
pause



:: 现在的仓库名
set NowUserName=Tmalll
set NowName=My-Tools-Template

:: 要修改的目标名称
set ToName=My-Bash-Tools

:: 修改 GitHub 仓库名
gh api -X PATCH -H "Accept: application/vnd.github+json" /repos/%NowUserName%/%NowName% -F name=%ToName%

:: 在你的本地仓库中更新远程地址
cd %~dp0
git remote set-url origin https://github.com/Tmalll/%ToName%.git

:: 测试推送
git push

:: 确认
git remote -v



pause
exit
