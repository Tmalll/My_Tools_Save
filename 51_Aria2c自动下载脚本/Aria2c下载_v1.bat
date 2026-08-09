@echo off

:: 1. 尝试从剪贴板读取内容到变量 dl_URL
set "dl_URL="
for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-Clipboard"') do set "dl_URL=%%i"

:: 检查剪贴板是否为空，若为空则提示用户手动输入
if not defined dl_URL (
    echo [提示] 剪贴板中未读取到内容！
    set /p "dl_URL=请手动输入或粘贴 URL: "
)

:: 再次检查 URL 是否有效
if not defined dl_URL (
    echo [错误] 未提供有效的 URL！
    pause
    exit /b
)

:: 显示最终确定的 URL
echo.
echo 刚读取的 URL:
echo "%dl_URL%"
echo.


:: 2. 提示用户输入文件名
set "dl_Name="
set /p "dl_Name=请输入文件名(留空按回车将自动使用当前时间戳): "

:: 3. 如果未输入文件名，直接通过单行 PowerShell 生成带后缀的完整文件名（避免 if 块内变量展开为空的 Bug）
if not defined dl_Name for /f %%i in ('powershell -NoProfile -Command "(Get-Date -Format 'yyyy-MM-dd_HH.mm.ss') + '.mp4'"') do set "dl_Name=%%i"

echo.
echo 最终确定的文件名: %dl_Name%
echo 开始下载...
echo.



:: 4. 调用 aria2c 开始下载
aria2c -d . -o "%dl_Name%" --check-certificate=false --file-allocation=none "%dl_URL%" ^
    --user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36" ^
    --http-proxy=192.168.1.29:10801 --https-proxy=192.168.1.29:10801 ^
    --max-connection-per-server=16 --split=8

pause
exit

把这段Aria2c下载脚本给我完善一下.
在开始的时候做一个选择单. 让用户选择,
按 1. 从剪贴板读取URL(当前这样)
按 2. 自己输入URL.
按 3. 从当前目录读取Input_URL_List.txt,  读取一个下载列表进行下载.



































