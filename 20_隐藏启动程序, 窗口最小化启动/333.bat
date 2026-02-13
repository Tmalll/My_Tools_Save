cls
taskkill /f /t /im Iceweasel.exe
set "AppPath=D:\01.Program_Soft\01-浏览器\03.Firefox\Iceweasel_FirefoxPlus\Iceweasel_x64\App\Iceweasel.exe"
set "NirPath=E:\01.userData\ZhuoMian\#CentDL\nircmd.exe"
:: 1. 强力启动：不使用 start，改用 nircmd 的 exec min
:: exec min 会尝试在创建进程时就传递“最小化”标志位给 Windows
"%NirPath%" exec min "%AppPath%"
:: 2. 瞬间透明化：趁它还没反应过来，直接把所有可能的窗口透明度拉到 0
"%NirPath%" win trans process "Iceweasel.exe" 0
:: 3. 补刀：针对那些不听话的“启动 Logo”或“全屏闪烁”
"%NirPath%" cmdwait 100 win trans process "Iceweasel.exe" 0
"%NirPath%" cmdwait 500 win hide process "Iceweasel.exe"
:: 4. 彻底封印
"%NirPath%" cmdwait 2000 win hide process "Iceweasel.exe"
"%NirPath%" win trans process "Iceweasel.exe" 255
echo [完成] 浏览器已通过“出生最小化”策略转入后台。

