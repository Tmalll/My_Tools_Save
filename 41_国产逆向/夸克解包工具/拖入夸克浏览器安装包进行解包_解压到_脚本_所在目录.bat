@echo off

:: 检查是否通过拖拽传入了文件
if "%~1"=="" (
    echo 【错误】请将要解包的 Inno 安装包拖拽到此脚本图标上！
    echo.
    pause
    exit /b
)

:: 获取拖拽文件的文件名（不含后缀）
set "FileName=%~n1"

:: 定义输出目录：脚本所在目录\安装包名的文件夹
set "OutputDir=%~dp0%FileName%"

:: 开始解包
"%~dp0innoextract.exe" -d "%OutputDir%" "%~1"

:: 重命名运行文件
ren "%OutputDir%\app\code$GetAppExeDestName" quark.exe
ren "%OutputDir%\app\code$GetAppProxyExeDestName" quark_proxy.exe

:: 移动解压出来的文件
move "%OutputDir%\app" "%~dp0TempDIR"
rmdir /s /q "%OutputDir%"
mkdir "%OutputDir%"
move "%~dp0TempDIR" "%OutputDir%\"
move "%OutputDir%\TempDIR" "%OutputDir%\app"

start "" "https://github.com/Bush2021/chrome_plus/releases/latest"

pause
exit





mkdir "%OutputDir%\app"
for /f "usebackq delims=" %%i in (`powershell -Command "(Get-ChildItem '%~dp0' -Filter '*.manifest' -Recurse | Select-Object -First 1).BaseName"`) do set "Version=%%i"
echo 提取到的版本号是: %Version%
