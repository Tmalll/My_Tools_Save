@echo off

:: 创建一个超长路径的文件夹
powershell New-Item -ItemType Directory -Path "C:\$( 'a'*250 )\$( 'b'*250 )\$( 'c'*250 )"

:: 删除这个超长路径文件夹
rmdir /s /q "C:\aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"


:: 1. 写入正统核心路径（FileSystem）
echo [1/2] 正在写入核心控制路径...
reg add "HKLM\SYSTEM\CurrentControlSet\Control\FileSystem" /v "LongPathsEnabled" /t REG_DWORD /d 1 /f

:: 2. 写入策略路径（作为备用/兼容强化）
echo [2/2] 正在写入策略兼容路径...
reg add "HKLM\SYSTEM\CurrentControlSet\Policies" /v "LongPathsEnabled" /t REG_DWORD /d 1 /f


pause
exit



