@echo off
setlocal enabledelayedexpansion

echo.
echo.
echo Base64_utility_for_Windows
echo.
echo 编码限制: 最大测试5G编码成功
echo 解码限制: 最大测试5G解码成功
echo 如要解码 certutil 编码的文件, 需要手动去除首尾行
echo.
echo.


:: 当前目录下的 base64.exe
set "BASE64_EXE=%~dp0base64.exe"

:: 检查 base64.exe 是否存在
if not exist "%BASE64_EXE%" (
    echo [错误] base64.exe 未找到，请确保它与脚本在同一目录下
    pause
    exit /b
)

:: 检查是否有拖放文件
if "%~1"=="" (
    echo 请把文件拖放到此脚本上
    pause
    exit /b
)

:: 记录开始时间（秒）
for /f %%T in ('powershell -NoProfile -Command "[int](Get-Date -UFormat %%s)"') do set startTime=%%T

:: 遍历所有拖放文件
for %%F in (%*) do (
    set "fullpath=%%~fF"
    set "filename=%%~nxF"
    set "ext=%%~xF"

    if /i "!ext!"==".b64" (
        
        echo 解码中: %%F
        "%BASE64_EXE%" -d "%%~fF" > "%%~dpnF"
        echo 解码完成: %%~dpnF
        
    ) else (
        
        echo 编码中: "%%~dpnF"
        "%BASE64_EXE%" -w0 "%%~fF" > "%%~dpnxF.b64"
         echo 编码完成: "%%~dpnxF.b64"
         
    )
)

:: 记录结束时间（秒）
for /f %%T in ('powershell -NoProfile -Command "[int](Get-Date -UFormat %%s)"') do set endTime=%%T
:: 计算耗时（秒）
set /a elapsed=%endTime%-%startTime%
echo 所有文件处理完成!
echo 总耗时: %elapsed% 秒
timeout /t 5 >nul
pause
exit
