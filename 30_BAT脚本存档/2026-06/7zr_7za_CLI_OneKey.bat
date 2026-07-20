@echo off

set "TOOLS_DIR=C:\#bat_tools"
set "EXTRA_ZIP=7z2602-extra.7z"
set "EXTRACT_DIR=7z2602-extra"

:: 1. 创建目标工具目录（如果不存在）
if not exist "%TOOLS_DIR%" (
    echo [*] 创建目标目录: %TOOLS_DIR%
    mkdir "%TOOLS_DIR%"
)

:: 2. 下载 7zr.exe 到 C:\#bat_tools
echo [*] 正在下载 7zr.exe 到 %TOOLS_DIR% ...
curl -L -o "%TOOLS_DIR%\7zr.exe" "https://github.com/ip7z/7zip/releases/latest/download/7zr.exe"

:: 3. 下载 7z2602-extra.7z 到当前脚本目录
echo [*] 正在下载 %EXTRA_ZIP% ...
curl -L -o "%~dp0%EXTRA_ZIP%" "https://github.com/ip7z/7zip/releases/latest/download/%EXTRA_ZIP%"

:: 4. 用刚才下载的 7zr.exe 解压到当前目录的 7z2602-extra 文件夹
echo [*] 正在解压 %EXTRA_ZIP% ...
"%TOOLS_DIR%\7zr.exe" x "%~dp0%EXTRA_ZIP%" -o"%~dp0%EXTRACT_DIR%"

:: 5. 提取 x64 下的三个核心文件到 C:\#bat_tools
echo [*] 正在提取 x64 核心文件到 %TOOLS_DIR% ...
copy /Y "%~dp0%EXTRACT_DIR%\x64\7za.dll" "%TOOLS_DIR%\"
copy /Y "%~dp0%EXTRACT_DIR%\x64\7za.exe" "%TOOLS_DIR%\"
copy /Y "%~dp0%EXTRACT_DIR%\x64\7zxa.dll" "%TOOLS_DIR%\"

:: 6. 清理临时文件和解压出来的文件夹
echo [*] 正在清理临时文件与文件夹 ...
if exist "%~dp0%EXTRA_ZIP%" del /F /Q "%~dp0%EXTRA_ZIP%"
if exist "%~dp0%EXTRACT_DIR%" rmdir /S /Q "%~dp0%EXTRACT_DIR%"

pause
exit

给我编写个.bat脚本


把
https://github.com/ip7z/7zip/releases/latest/download/7zr.exe
下载到
"C:\#bat_tools"

然后下载
https://github.com/ip7z/7zip/releases/latest/download/7z2602-extra.7z
到脚本所在目录

用刚才下载的 7zr.exe 解压到 脚本当前目录 7z2602-extra 文件夹

然后提取
\x64\7za.dll
\x64\7za.exe
\x64\7zxa.dll

三个文件到
"C:\#bat_tools"

最后删除 7z2602-extra.7z
7z2602-extra 文件夹





