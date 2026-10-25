@echo off

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
title %~nx0
echo.
echo 当前运行为: [ %~nx0 ] 
echo.

pause
pause
pause
echo.

:: 1.禁止网络共享目录生成 thumbs.db
reg add "HKCU\Software\Policies\Microsoft\Windows\Explorer" /v DisableThumbsDBOnNetworkFolders /d 1 /t REG_DWORD /f
::	作用：禁止网络共享目录生成 thumbs.db, 这是微软官方支持项对 SMB/NAS 很重要

:: 2.关闭缩略图的缓存, 禁止本地磁盘生成缩略图缓存（关键）
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v NoThumbnailCache /d 0 /t REG_DWORD /f
::	作用：禁用本地缩略图缓存, 会让资源管理器每次重新实时解码图片/视频
::	问题：CPU占用增加, 打开大图片目录明显变卡, Explorer 更容易卡死, 对 NAS 未必减轻锁问题
::	而且它禁止的是thumbcache_*.db, 不是 thumbs.db

:: 3.禁止自动文件夹类型发现
reg add "HKCU\Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\Bags\AllFolders\Shell" /v FolderType /t REG_SZ /d NotSpecified /f

:: 4.禁止隐藏 thumbs.db
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v DisableThumbnailCache /t REG_DWORD /d 1 /f

:: 5.禁止媒体中心旧版 thumbs.db
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v DisableThumbsOnNetworkFolders /t REG_DWORD /d 1 /f

:: 6.禁止Explorer预读取媒体元数据
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v DisablePreviewDesktop /t REG_DWORD /d 1 /f
echo.

echo 请确认是否删除缓存, 并重启 explorer.exe 和 dllhost.exe, 3
echo %LocalAppData%\Microsoft\Windows\Explorer\thumbcache*
echo.
pause

echo 请确认是否删除缓存, 并重启 explorer.exe 和 dllhost.exe, 2
echo %LocalAppData%\Microsoft\Windows\Explorer\thumbcache*
echo.
pause

echo 请确认是否删除缓存, 并重启 explorer.exe 和 dllhost.exe, 1
echo %LocalAppData%\Microsoft\Windows\Explorer\thumbcache*
echo.
pause


:: 删除旧缓存, 并且重启资源管理器...
del /f /q "%LocalAppData%\Microsoft\Windows\Explorer\thumbcache*"
taskkill /f /im explorer.exe
taskkill /f /im dllhost.exe
start explorer.exe
echo.

echo 请确认是否 [ 完全禁用缩略图 ] 5 && echo. && pause
echo 请确认是否 [ 完全禁用缩略图 ] 4 && echo. && pause
echo 请确认是否 [ 完全禁用缩略图 ] 3 && echo. && pause
echo 请确认是否 [ 完全禁用缩略图 ] 2 && echo. && pause
echo 请确认是否 [ 完全禁用缩略图 ] 1 && echo. && pause


:完全禁用缩略图
:: 完全禁用缩略图
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v IconsOnly /t REG_DWORD /d 1 /f
::	1 = 完全禁缩略图
::	0 = 允许实时缩略图

:: 关闭缩略图显示并仅显示图标。
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v DisableThumbnails /t REG_DWORD /d 1 /f

:: 关闭缩略图显示并仅显示图标, 在网络文件夹上
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v DisableThumbnailsOnNetworkFolders /d 1 /t REG_DWORD /f



pause
exit




缩略图缓存文件夹
C:\Users\Administrator\AppData\Local\Microsoft\Windows\Explorer






::	如果你发现：
::	文件夹删不掉
::	SMB占用
::	explorer退出后还占用
::	taskkill /f /im dllhost.exe










