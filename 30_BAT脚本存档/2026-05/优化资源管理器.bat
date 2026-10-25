@echo off
title Everything 用户专用优化（禁后台、禁缩略图、禁网络探测）

echo === 1. 禁用 Windows Search 服务（减少后台占用）===
sc stop WSearch >nul 2>&1
sc config WSearch start= disabled >nul 2>&1
:: 风险：开始菜单搜索变慢（你不用它，所以无影响）

echo === 2. 禁用 Web 搜索 / Bing 搜索（阻止 SearchApp 唤醒）===
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search" /v DisableWebSearch /t REG_DWORD /d 1 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Search" /v BingSearchEnabled /t REG_DWORD /d 0 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Search" /v CloudSearchEnabled /t REG_DWORD /d 0 /f >nul
:: 风险：开始菜单不再显示网络结果（你不需要）

echo === 3. 禁用 Thumbs.db（网络缩略图缓存）===
reg add "HKCU\Software\Policies\Microsoft\Windows\Explorer" /v DisableThumbsDBOnNetworkFolders /t REG_DWORD /d 1 /f >nul
:: 风险：网络文件夹不再生成缩略图缓存（通常是好事）

rem echo === 4. 禁用本地缩略图缓存（提升大文件夹速度）===
rem reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v DisableThumbnailCache /t REG_DWORD /d 1 /f >nul
rem reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v IconsOnly /t REG_DWORD /d 1 /f >nul
:: 风险：图片/视频文件夹不再显示缩略图，只显示图标

echo === 5. 禁用媒体元数据读取（避免 EXIF/视频扫描卡顿）===
reg add "HKCU\Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\Bags\AllFolders\Shell" /v FolderType /t REG_SZ /d NotSpecified /f >nul
:: 风险：文件夹不再自动切换到“图片/视频”模板

echo === 6. 禁用自动文件夹类型发现（避免扫描文件夹内容）===
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v NoFolderTypeDiscovery /t REG_DWORD /d 1 /f >nul
:: 风险：所有文件夹都按“常规项目”显示

rem echo === 7. 禁用 Quick Access 自动记录（减少扫描最近文件）===
rem reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer" /v ShowRecent /t REG_DWORD /d 0 /f >nul
rem reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer" /v ShowFrequent /t REG_DWORD /d 0 /f >nul
:: 风险：快速访问不再自动更新

echo === 8. 禁用网络爬虫（避免桌面网络快捷方式卡顿）===
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v NoNetCrawling /t REG_DWORD /d 1 /f >nul
:: 风险：Explorer 不再自动扫描网络（通常是好事）

echo === 9. 禁用网络目录缓存（避免 SMB 卡顿）===
reg add "HKLM\SYSTEM\CurrentControlSet\Services\LanmanWorkstation\Parameters" /v DirectoryCacheLifetime /t REG_DWORD /d 0 /f >nul
:: 风险：网络访问更实时，但可能略微增加网络请求次数

echo === 10. 禁用 SearchHost / SearchApp 后台唤醒 ===
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Search" /v CortanaConsent /t REG_DWORD /d 0 /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Search" /v SearchboxTaskbarMode /t REG_DWORD /d 0 /f >nul
:: 风险：任务栏搜索框不可用（你不需要）

:: 漏网之鱼 3：禁用“网络位置自动检测”
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\MountPoints2" /v NoRemoteRecursiveEvents /t REG_DWORD /d 1 /f >nul

:: 补充 1：禁用“自动搜索网络打印机和共享”
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Print" /v DisableWebPnPDownload /t REG_DWORD /d 1 /f >nul

:: 补充 2：禁用“自动搜索网络设备”
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer" /v NoNetConnectDisconnect /t REG_DWORD /d 1 /f >nul







echo.
echo === 所有 Everything 优化已完成 ===
echo 建议重启以完全生效。
pause
exit
















