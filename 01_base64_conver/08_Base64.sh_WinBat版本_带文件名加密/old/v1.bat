@echo off
setlocal enabledelayedexpansion

:: 检查是否安装了uutils coreutils
where coreutils >nul 2>nul
if errorlevel 1 (
    echo 错误: 未找到 coreutils 命令
    echo 请从 https://github.com/uutils/coreutils 下载并安装
    echo 将 coreutils.exe 添加到系统 PATH 环境变量
    pause
    exit /b 1
)

:: 显示接收到的所有参数（调试信息）
echo 调试信息:
echo 接收到的参数: %*
echo.

:: 检查是否有拖放文件
if "%~1"=="" (
    goto SHOW_HELP
)

:: 使用 %%* 获取完整路径（处理带空格的路径）
set "FULL_PATH=%*"

:: 检查文件是否存在
if not exist "%FULL_PATH%" (
    echo 错误: 文件不存在
    echo 路径: "%FULL_PATH%"
    pause
    exit /b 1
)

:: 获取文件信息 - 使用一个更可靠的方法
for %%F in ("%FULL_PATH%") do (
    set "INPUT_FILE=%%~fF"
    set "FILENAME=%%~nxF"
    set "EXTENSION=%%~xF"
    set "BASENAME=%%~nF"
    set "FILEPATH=%%~dpF"
)

:: 显示文件信息
echo ========================================
echo 处理文件: %INPUT_FILE%
echo 文件名: %FILENAME%
echo.

:: 根据文件扩展名判断处理方式
if /i "%EXTENSION%"==".b64" (
    echo 检测到 .b64 文件，自动普通解码
    goto DECODE_NORMAL
)
if /i "%EXTENSION%"==".efb64" (
    echo 检测到 .efb64 文件，自动加密解码
    goto DECODE_ENCRYPT
)

echo 检测到普通文件，请选择编码模式
goto MENU

:SHOW_HELP
echo Base64 编码/解码工具 (Windows 拖放版)
echo.
echo 用法: 将文件拖放到此脚本上
echo.
echo 功能说明:
echo   1. 普通文件 (.txt, .jpg, 等) - 弹出菜单选择编码方式
echo   2. .b64 文件 - 自动普通解码
echo   3. .efb64 文件 - 自动加密解码
echo.
echo 请将文件拖放到此脚本上使用
pause
exit /b 0

:: 普通文件，显示菜单
:MENU
echo.
echo 请选择编码模式:
echo.
echo  [1] 普通编码 (输出 .b64 文件)
echo  [2] 加密文件名编码 (输出 .efb64 文件)
echo  [3] 强制编码 (忽略扩展名，重新编码一次，输出和源文件相同的.b64文件)
echo  [4] 退出
echo.
set /p CHOICE="请输入选择 (1-4): "

if "%CHOICE%"=="1" goto ENCODE_NORMAL
if "%CHOICE%"=="2" goto ENCODE_ENCRYPT
if "%CHOICE%"=="3" goto FORCE_ENCODE
if "%CHOICE%"=="4" exit /b 0

echo 无效选择，请重新输入
goto MENU

:: ========== 编码函数 ==========

:ENCODE_NORMAL
echo 正在普通编码文件...
set "OUTPUT_FILE=%BASENAME%%EXTENSION%.b64"
set "OUTPUT_PATH=%FILEPATH%%OUTPUT_FILE%"

:: 检查文件是否已存在
if exist "%OUTPUT_PATH%" (
    echo 警告: 输出文件 "%OUTPUT_FILE%" 已存在
    set /p OVERWRITE="是否覆盖? (Y/N): "
    if /i not "!OVERWRITE!"=="Y" (
        echo 操作已取消
        pause
        exit /b 0
    )
)

coreutils base64 -w 0 "%INPUT_FILE%" > "%OUTPUT_PATH%"
if errorlevel 1 (
    echo 编码失败
    pause
    exit /b 1
)

echo 完成: 普通编码
echo 输出文件: %OUTPUT_PATH%
call :GET_FILE_SIZE "%OUTPUT_PATH%"
echo 文件大小: %FILE_SIZE% 字节
goto END

:ENCODE_ENCRYPT
echo 正在加密文件名编码...

:: 获取文件名和扩展名
set "NAME_ONLY=%BASENAME%"
set "EXT_ONLY=%EXTENSION:~1%"

:: 编码文件名部分（URL安全base64）
if "%EXT_ONLY%"=="" (
    :: 没有扩展名
    for /f "delims=" %%a in ('echo.!NAME_ONLY! ^| coreutils base64 -w 0') do set "ENC_NAME=%%a"
    :: URL安全base64：+ 转 _，/ 转 -
    set "ENC_NAME=!ENC_NAME: =!"
    set "ENC_NAME=!ENC_NAME:+=_!"
    set "ENC_NAME=!ENC_NAME:/=-!"
    set "OUTPUT_FILE=!ENC_NAME!.efb64"
) else (
    :: 有扩展名
    for /f "delims=" %%a in ('echo.!NAME_ONLY! ^| coreutils base64 -w 0') do set "ENC_NAME=%%a"
    for /f "delims=" %%a in ('echo.!EXT_ONLY! ^| coreutils base64 -w 0') do set "ENC_EXT=%%a"
    :: URL安全base64：+ 转 _，/ 转 -
    set "ENC_NAME=!ENC_NAME: =!"
    set "ENC_NAME=!ENC_NAME:+=_!"
    set "ENC_NAME=!ENC_NAME:/=-!"
    set "ENC_EXT=!ENC_EXT: =!"
    set "ENC_EXT=!ENC_EXT:+=_!"
    set "ENC_EXT=!ENC_EXT:/=-!"
    set "OUTPUT_FILE=!ENC_NAME!.!ENC_EXT!.efb64"
)

set "OUTPUT_PATH=%FILEPATH%%OUTPUT_FILE%"

:: 检查文件是否已存在
if exist "%OUTPUT_PATH%" (
    echo 警告: 输出文件 "%OUTPUT_FILE%" 已存在
    set /p OVERWRITE="是否覆盖? (Y/N): "
    if /i not "!OVERWRITE!"=="Y" (
        echo 操作已取消
        pause
        exit /b 0
    )
)

coreutils base64 -w 0 "%INPUT_FILE%" > "%OUTPUT_PATH%"
if errorlevel 1 (
    echo 编码失败
    pause
    exit /b 1
)

echo 完成: 加密编码
echo 输出文件: %OUTPUT_PATH%
call :GET_FILE_SIZE "%OUTPUT_PATH%"
echo 文件大小: %FILE_SIZE% 字节
goto END

:FORCE_ENCODE
echo 强制编码（忽略扩展名，重新编码一次）...
set "OUTPUT_FILE=%FILENAME%.b64"
set "OUTPUT_PATH=%FILEPATH%%OUTPUT_FILE%"

if exist "%OUTPUT_PATH%" (
    echo 警告: 输出文件 "%OUTPUT_FILE%" 已存在
    set /p OVERWRITE="是否覆盖? (Y/N): "
    if /i not "!OVERWRITE!"=="Y" (
        echo 操作已取消
        pause
        exit /b 0
    )
)

coreutils base64 -w 0 "%INPUT_FILE%" > "%OUTPUT_PATH%"
if errorlevel 1 (
    echo 编码失败
    pause
    exit /b 1
)

echo 完成: 强制编码
echo 输出文件: %OUTPUT_PATH%
call :GET_FILE_SIZE "%OUTPUT_PATH%"
echo 文件大小: %FILE_SIZE% 字节
goto END

:: ========== 解码函数 ==========

:DECODE_NORMAL
echo 正在普通解码文件 (.b64)...

:: 去掉 .b64 后缀得到原始文件名
set "BASE_NAME=%BASENAME%"
set "OUTPUT_FILE=%BASE_NAME%"
set "OUTPUT_PATH=%FILEPATH%%OUTPUT_FILE%"

if exist "%OUTPUT_PATH%" (
    echo 警告: 输出文件 "%OUTPUT_FILE%" 已存在
    set /p OVERWRITE="是否覆盖? (Y/N): "
    if /i not "!OVERWRITE!"=="Y" (
        echo 操作已取消
        pause
        exit /b 0
    )
)

coreutils base64 -d "%INPUT_FILE%" > "%OUTPUT_PATH%"
if errorlevel 1 (
    echo 解码失败，文件可能不是有效的base64编码
    del "%OUTPUT_PATH%" 2>nul
    pause
    exit /b 1
)

echo 完成: 普通解码
echo 输出文件: %OUTPUT_PATH%
call :GET_FILE_SIZE "%OUTPUT_PATH%"
echo 文件大小: %FILE_SIZE% 字节
goto END

:DECODE_ENCRYPT
echo 正在加密解码文件 (.efb64)...
set "BASE_NAME=%BASENAME%"

echo !BASE_NAME! | find "." >nul
if errorlevel 1 (
    set "ENC_NAME=!BASE_NAME!"
    set "ENC_EXT="
) else (
    for /f "tokens=1,2 delims=." %%a in ("!BASE_NAME!") do (
        set "ENC_NAME=%%a"
        set "ENC_EXT=%%b"
    )
)

:: 解码文件名 - 使用PowerShell
setlocal enabledelayedexpansion
if defined ENC_EXT (
    :: 有扩展名的情况
    set "TEMP_NAME=!ENC_NAME:_=+!"
    set "TEMP_NAME=!TEMP_NAME:-=/!"
    
    :: 使用PowerShell解码base64，去掉所有空白字符
    for /f "delims=" %%a in ('powershell -Command "Write-Host -NoNewline (([System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('!TEMP_NAME!')) -replace '\s', ''))"') do set "DEC_NAME=%%a"
    
    set "TEMP_EXT=!ENC_EXT:_=+!"
    set "TEMP_EXT=!TEMP_EXT:-=/!"
    
    for /f "delims=" %%a in ('powershell -Command "Write-Host -NoNewline (([System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('!TEMP_EXT!')) -replace '\s', ''))"') do set "DEC_EXT=%%a"
    
    if "!DEC_NAME!"=="" (
        echo 解码失败，无法解码文件名
        pause
        exit /b 1
    )
    
    set "OUTPUT_FILE=!DEC_NAME!.!DEC_EXT!"
) else (
    :: 没有扩展名的情况
    set "TEMP_NAME=!ENC_NAME:_=+!"
    set "TEMP_NAME=!TEMP_NAME:-=/!"
    
    for /f "delims=" %%a in ('powershell -Command "Write-Host -NoNewline (([System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('!TEMP_NAME!')) -replace '\s', ''))"') do set "DEC_NAME=%%a"
    
    if "!DEC_NAME!"=="" (
        echo 解码失败，无法解码文件名
        pause
        exit /b 1
    )
    
    set "OUTPUT_FILE=!DEC_NAME!"
)
endlocal & set "OUTPUT_FILE=%OUTPUT_FILE%"
set "OUTPUT_PATH=%FILEPATH%%OUTPUT_FILE%"

:: 检查输出文件是否已存在
if exist "%OUTPUT_PATH%" (
    echo 警告: 输出文件 "%OUTPUT_FILE%" 已存在
    set /p OVERWRITE="是否覆盖? (Y/N): "
    if /i not "!OVERWRITE!"=="Y" (
        echo 操作已取消
        pause
        exit /b 0
    )
)

:: 解码文件内容 - 使用coreutils
coreutils base64 -d "%INPUT_FILE%" > "%OUTPUT_PATH%"
if errorlevel 1 (
    echo 解码失败，文件可能不是有效的base64编码
    del "%OUTPUT_PATH%" 2>nul
    pause
    exit /b 1
)

echo 完成: 加密解码
echo 输出文件: %OUTPUT_PATH%
call :GET_FILE_SIZE "%OUTPUT_PATH%"
echo 文件大小: %FILE_SIZE% 字节
goto END

:: ========== 辅助函数 ==========

:GET_FILE_SIZE
set "SIZE_FILE=%~1"
set "FILE_SIZE=0"
for %%F in ("%SIZE_FILE%") do set "FILE_SIZE=%%~zF"
exit /b

:: ========== 结束 ==========

:END
echo ========================================
echo 处理完成!
timeout /t 3 >nul
exit /b 0