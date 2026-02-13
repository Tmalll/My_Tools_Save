cls
taskkill /f /t /im Iceweasel.exe 

set "AppDir=D:\01.Program_Soft\01-浏览器\03.Firefox\Iceweasel_FirefoxPlus\Iceweasel_x64\App"
set "AppPath=%AppDir%\Iceweasel.exe"
set "NirPath=E:\01.userData\ZhuoMian\#CentDL\nircmd.exe"

:: 1. 动态生成发射器 (使用 vbHide + 指定工作目录确保不弹窗)
echo Set ws = CreateObject("WScript.Shell") > launcher.vbs
echo ws.CurrentDirectory = "%AppDir%" >> launcher.vbs
echo ws.Run "cmd /c start /min Iceweasel.exe", 0, False >> launcher.vbs

:: 2. 运行发射器
cscript //nologo launcher.vbs

:: 3. 密集补刀：在 3 秒内多次执行隐藏命令，应对浏览器启动慢导致的“错过”
:: 采用循环或多点拦截，确保覆盖浏览器 UI 映射到任务栏的瞬间
"%NirPath%" cmdwait 500 win hide class "MozillaWindowClass"
"%NirPath%" cmdwait 1000 win hide class "MozillaWindowClass"
"%NirPath%" cmdwait 2000 win hide class "MozillaWindowClass"
"%NirPath%" cmdwait 3000 win hide class "MozillaWindowClass"

:: 4. 清理并退出
del launcher.vbs
echo [完成] 浏览器已通过 VBS 引导并进行高频后台锁定。