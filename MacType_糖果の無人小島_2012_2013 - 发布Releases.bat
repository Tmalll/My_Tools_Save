@echo off
setlocal EnableExtensions


:: 一般情况只修改这两个就行了...
:: 指定, 待发布资产目录
set "ASSETS_DIR=E:\01.userData\ZhuoMian\MacType_糖果の無人小島\MacType_糖果の無人小島_2017_2018"

:: 一般情况只修改这两个就行了...
:: 指定, 发布标签
set "RELEASE_TAG='MacType_糖果の無人小島_2017_2018'"






:: 新建, 新分支名称
set "NEW_BRANCH=release-branch"



:: 设置代理服务器
set http_proxy=socks5h://192.168.1.40:10800
set https_proxy=%http_proxy%
set HTTP_PROXY=%http_proxy%
set HTTPS_PROXY=%http_proxy%

:: 仓库路径
set "REPO_DIR=%~dp0"

:: 发布标题
set "RELEASE_TITLE=%RELEASE_TAG%"

:MENU
cls
echo ===================================================
echo             GitHub Release 发布脚本
echo ===================================================
echo  当前配置信息：
echo  发布标签/标题:   [ %RELEASE_TAG% ]
echo  本地仓库目录:    [ %REPO_DIR% ]
echo  待发布资产目录:  [ %ASSETS_DIR% ]
echo ===================================================
echo  【请选择你要执行的操作】
echo.
echo  [1] 一键发布 Release (递归扫描所有文件并平铺上传)
echo.
echo  [2] 彻底删除 Release (删除发布页面并清理云端 Tag)
echo.
echo  [3] 新建一个 [ %NEW_BRANCH% ] 分支专门用来发布Release文件
echo.
echo  [0] 退出脚本
echo ===================================================
echo.

set /p "CHOICE=请输入数字并回车: "

if "%CHOICE%"=="1" goto DO_PUBLISH
if "%CHOICE%"=="2" goto DO_DELETE
if "%CHOICE%"=="3" goto DO_BRANCH_NEW
if "%CHOICE%"=="0" goto END
echo 【错误】输入无效，请重新输入！ && pause && goto MENU


:: =================【功能 1：发布 Release】=================
:DO_PUBLISH
cls
echo [1/3] 正在切换到仓库目录...
cd /d "%REPO_DIR%"

echo [2/3] 正在检查或创建 GitHub Release 页面 [%RELEASE_TAG%]...
:: 尝试创建，如果已存在，gh 会报错但会被 2>nul 忽略，不影响后续追加上传
gh release create %RELEASE_TAG% --title "%RELEASE_TITLE%" --generate-notes --target "%NEW_BRANCH%" 2>nul


echo [3/3] 正在递归遍历并平铺上传目录及子目录下所有文件...
if not exist "%ASSETS_DIR%" (
    echo 【错误】找不到指定的待发布目录: %ASSETS_DIR%
    pause
    goto MENU
)

:: /R 穿透扫描所有子目录下的文件并上传
for /R "%ASSETS_DIR%" %%F in (*) do (
    echo 正在上传: %%~nxF
    gh release upload %RELEASE_TAG% "%%F" --clobber
)

echo ===================================================
echo  【大功告成】所有文件已成功穿透平铺发布至 %RELEASE_TAG%！
echo ===================================================
pause
goto MENU


:: =================【功能 2：删除 Release】=================
:DO_DELETE
cls
echo ?? 警报：你正在尝试彻底删除 GitHub 上的 [%RELEASE_TAG%] 对应的 Release 和云端 Tag！
echo 删除后资产将无法找回。
set /p "CONFIRM=确认请输入 Y，取消请输入其他任意键: "

if /i "%CONFIRM%" NEQ "Y" (
    echo 操作已取消。
    pause
    goto MENU
)

echo [1/2] 正在切换到仓库目录...
cd /d "%REPO_DIR%"

echo [2/2] 正在从 GitHub 彻底删除 Release 及其云端 Tag [%RELEASE_TAG%]...
gh release delete %RELEASE_TAG% --cleanup-tag --yes

if %ERRORLEVEL% EQU 0 (
    echo ===================================================
    echo  【成功】Release 和远端 Tag [%RELEASE_TAG%] 已斩草除根！
    echo  提示：如果你本地也生成过该 Tag，建议手动执行 `git tag -d %RELEASE_TAG%` 清理本地。
    echo ===================================================
) else (
    echo 【错误】删除失败，请检查网络或该 Release 是否确实存在。
)
pause
goto MENU

:: =================【功能 3：创建干净分支, 专门用来发布 Release】=================
:DO_BRANCH_NEW

:: 检查是否为Git仓库
git rev-parse --git-dir >nul 2>&1 || (
    echo [错误] 当前目录不是 Git 仓库
    pause
    exit /b 1
)

echo [1/7] 删除旧的本地分支...
git branch -D %NEW_BRANCH% >nul 2>&1

echo [2/7] 删除旧的远程分支...
git push origin --delete %NEW_BRANCH% >nul 2>&1

echo [3/7] 创建 README Blob...
:: 获取时间戳
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH.mm.ss"') do set "timestamp=%%i"
:: 生成说明文件内容
(
    echo # Release Branch
    echo.
    echo ***
    echo This branch is intentionally clean.  
    echo This branch was created on %timestamp%.  
    echo.
    echo ***
) > "%TEMP%\release_readme.txt"

for /f %%i in ('git hash-object -w "%TEMP%\release_readme.txt"') do ( set "BLOB_SHA=%%i" ) 

echo Blob=%BLOB_SHA%

if not defined BLOB_SHA (
    echo [错误] 创建 Blob 失败
    pause
    exit /b 1
)

echo [4/7] 创建 Tree...

> "%TEMP%\release_tree.txt" (
    <nul set /p=100644 blob %BLOB_SHA%	README.md
)

for /f %%i in ('git mktree ^< "%TEMP%\release_tree.txt"') do ( set "TREE_SHA=%%i" ) 

echo Tree=%TREE_SHA%

if not defined TREE_SHA (
    echo [错误] 创建 Tree 失败
    pause
    exit /b 1
)

echo [5/7] 创建 Commit...

for /f %%i in ('git commit-tree %TREE_SHA% -m "Initialize clean release branch"') do ( set "COMMIT_SHA=%%i" ) 

echo Commit=%COMMIT_SHA%

if not defined COMMIT_SHA (
    echo [错误] 创建 Commit 失败
    pause
    exit /b 1
)

echo [6/7] 创建 %NEW_BRANCH%...

git update-ref refs/heads/%NEW_BRANCH% %COMMIT_SHA%

if errorlevel 1 (
    echo [错误] 创建分支失败
    pause
    exit /b 1
)

echo [7/7] 推送到远端...

git push -u origin %NEW_BRANCH% --force

if errorlevel 1 (
    echo [错误] 推送失败
    pause
    exit /b 1
)

del "%TEMP%\release_readme.txt" >nul 2>&1
del "%TEMP%\release_tree.txt" >nul 2>&1

echo.
echo ===================================================
echo 成功！
echo.
echo %NEW_BRANCH% 现在只包含：
echo.
echo     README.md
echo.
echo 当前工作区完全没有被修改。
echo ===================================================
echo.

echo 验证：
git ls-tree -r %NEW_BRANCH%
echo.
git ls-tree -r %NEW_BRANCH% --name-only
echo.

:: =================【新加步骤：直接打开远程分支页面】=================
echo [额外步骤] 正在尝试打开远程分支页面...

:: 1. 直接获取 https 链接
for /f "tokens=*" %%i in ('git config --get remote.origin.url') do ( set "WEB_URL=%%i" )

:: 2. 拼接分支路径并直接打开
if defined WEB_URL (
    echo 正在打开: %WEB_URL%/tree/%NEW_BRANCH%
    start "" "%WEB_URL%/tree/%NEW_BRANCH%"
)
:: ===================================================================

pause
goto MENU

:END
echo 感谢使用，脚本已退出。
timeout /t 2 >nul
exit /b