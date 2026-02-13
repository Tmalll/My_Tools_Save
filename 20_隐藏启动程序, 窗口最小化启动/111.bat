cls
taskkill /f /t /im Iceweasel.exe 
set "AppDir=D:\01.Program_Soft\01-浏览器\03.Firefox\Iceweasel_FirefoxPlus\Iceweasel_x64\App"
set "AppPath=%AppDir%\Iceweasel.exe"
:: 1. 动态生成发射器 (关键点：vbHide + 指定工作目录)
echo Set ws = CreateObject("WScript.Shell") > launcher.vbs
echo ws.CurrentDirectory = "%AppDir%" >> launcher.vbs
echo ws.Run "cmd /c start /min Iceweasel.exe", 0, False >> launcher.vbs
:: 2. 运行发射器
cscript //nologo launcher.vbs
:: 3. 此时浏览器应该已经以最小化/隐藏状态启动了
:: 我们用 NirCmd 在后台“补一刀”，确保它彻底不在任务栏出现
set "NirPath=E:\01.userData\ZhuoMian\#CentDL\nircmd.exe"
"%NirPath%" cmdwait 1000 win hide class "MozillaWindowClass"
:: 4. 清理
del launcher.vbs
echo [调试] 发射指令已完成，请观察任务栏。
