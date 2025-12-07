@echo off
echo 请核对要修改的信息.
pause
echo 请核对要修改的信息.
pause
echo 请核对要修改的信息.
pause

:: 设置用户名
set UserName=Tmalll

:: 设置仓库名称
set REPO_NAME=MosDNS_v3

:: 获取脚本所在目录
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

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


echo 完成！
pause

