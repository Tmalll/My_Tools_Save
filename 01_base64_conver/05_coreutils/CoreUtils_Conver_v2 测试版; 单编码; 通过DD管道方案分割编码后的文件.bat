@echo off
setlocal enabledelayedexpansion













:split_mode

:: 生成文件名：原文件名.partXYZ.b64
set "num=00!i!"
set "num=!num:~-3!"
set "fname=%file%.part!num!"

set /a skip=!i!-1
coreutils.exe dd if=%file% bs=%SplitBlock%M count=1 skip=!skip! 2>nul | coreutils.exe base64 -w 0 > "!fname!.b64"

for %%A in ("!fname!.b64") do (
    if %%~zA==0 (
        del /q "%%A"
        echo 完成。共生成：%i% 块。
        goto done
    )
)

echo 生成 !fname!.b64
set /a i+=1
goto split_mode



