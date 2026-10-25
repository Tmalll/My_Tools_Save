@echo off
rem 1. 创建一个自定义的 ProgID，让它指向资源管理器
reg add "HKCU\Software\Classes\Explorer.FTP" /ve /t REG_SZ /d "Windows 资源管理器 (FTP)" /f
reg add "HKCU\Software\Classes\Explorer.FTP\shell\open\command" /ve /t REG_SZ /d "C:\Windows\explorer.exe %%1" /f

rem 2. 建立应用功能声明 (Capabilities)，绑定 ftp 协议到这个 ProgID
reg add "HKCU\Software\WindowsExplorerFTP\Capabilities\URLAssociations" /v "ftp" /t REG_SZ /d "Explorer.FTP" /f

rem 3. 将这个虚构的“应用”注册到当前用户的已注册应用列表中
reg add "HKCU\Software\RegisteredApplications" /v "WindowsExplorerFTP" /t REG_SZ /d "Software\WindowsExplorerFTP\Capabilities" /f

rem 4. 重启资源管理器刷新系统缓存
taskkill /f /im explorer.exe
start explorer.exe

echo =======================================================
echo 注册成功！
echo 请关闭并重新打开 Windows 默认应用设置页面。
echo 此时点击 Edge，弹出菜单里应该会出现“Windows 资源管理器 (FTP)”，选择它即可！
echo =======================================================
pause