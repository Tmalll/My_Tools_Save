@echo off

if "%~1"=="" (
    echo ======================================================
    echo 【使用说明】请把需要安装的 .appx 或 .appxbundle 文件
    echo 直接拖动到这个 .bat 脚本图标上放开，即可自动完成安装。
    echo ======================================================
    pause
    exit /b
)

:loop
if "%~1"=="" goto end
echo ------------------------------------------------------
echo 正在安装: %~nx1
echo ------------------------------------------------------

powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-AppxPackage -Path '%~1'"

if %ERRORLEVEL% neq 0 (
    echo [错误] 安装失败！可能由于：
    echo 1. 没有使用管理员权限运行（如需要，请尝试右键用管理员身份运行该脚本后再拖入）
    echo 2. 系统中已存在更高版本的相同应用
    echo 3. 缺少该应用所需的其他系统依赖组件
) else (
    echo [成功] 安装完成！
)

shift
goto loop

:end
echo ------------------------------------------------------
echo 所有拖入的文件处理完毕！
pause