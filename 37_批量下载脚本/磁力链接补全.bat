@echo off
title 磁力链接自动补全工具

:start
cls
echo ===================================================
echo               磁力链接自动补全工具
echo ===================================================
echo.
echo 请输入或右键粘贴你的神秘代码（例如: 76942463A...）：
set /p code=＞ 

:: 检查用户是否输入了内容
if "%code%"=="" (
    echo.
    echo [错误] 输入不能为空，请重新输入！
    pause
    goto start
)

:: 拼接前缀
set "full_magnet=magnet:?xt=urn:btih:%code%"

:: 将结果复制到剪贴板
echo | set /p="%full_magnet%" | clip

echo.
echo ===================================================
echo [成功] 已成功补全磁力链接！
echo ===================================================
echo 完整链接如下：
echo.
echo %full_magnet%
echo.
echo ===================================================
echo [提示] 链接已自动复制到您的剪贴板，可直接去下载工具中粘贴。
echo.

pause
goto start