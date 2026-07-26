@echo off
chcp 936 >nul
setlocal enabledelayedexpansion

:: 1. 设置 MosDNS 可执行文件路径
set "mosdnsPath=%~dp0mosdns.exe"

:: 检查 mosdns.exe 是否存在
if not exist "%mosdnsPath%" (
    echo [错误] 未在脚本目录下找到 mosdns.exe！
    echo 期待路径: "%mosdnsPath%"
    pause
    exit /b
)

:: 2. 检查是否有文件拖入
if "%~1"=="" (
    echo [提示] 请将要转换的 .dat 文件直接拖拽到此批处理图标上！
    pause
    exit /b
)

:: 获取拖入文件的路径及文件名
set "inputFile=%~1"
set "inputDir=%~dp1"
set "inputFullFileName=%~nx1"

echo ==================================================
echo  正在处理文件: !inputFullFileName!
echo ==================================================

:: 3. 在拖入文件所在的目录下新建工作目录: DIR-拖入文件名.dat
set "targetDir=!inputDir!!inputFullFileName!-DIR-"

if exist "!targetDir!" rmdir /s /q "!targetDir!"
mkdir "!targetDir!"

:: 4. 复制目标文件到工作目录（保持原文件名）
copy /y "!inputFile!" "!targetDir!\!inputFullFileName!" >nul

:: 5. 切换到工作目录并执行 MosDNS 转换命令（动态传入拖入的文件名）
cd /d "!targetDir!"

echo 正在调用 MosDNS 进行解码转换...
"%mosdnsPath%" -conv-v2ray-ip-dat "!inputFullFileName!"

:: 6. 切回脚本目录并删除工作目录中的临时原文件
cd /d "%~dp0"
if exist "!targetDir!\!inputFullFileName!" del /f /q "!targetDir!\!inputFullFileName!"

echo ==================================================
echo 处理完成！已自动清理工作目录中的临时 !inputFullFileName!。
echo 转换后的文件夹位于源文件目录:
echo "!targetDir!"
echo ==================================================

pause
exit /b