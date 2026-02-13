
taskkill /f /t /im Iceweasel.exe
set "AppPath=D:\01.Program_Soft\01-浏览器\03.Firefox\Iceweasel_FirefoxPlus\Iceweasel_x64\App\Iceweasel.exe"
set "NirPath=E:\01.userData\ZhuoMian\#CentDL\nircmd.exe"
:: 1. 启动浏览器
start "" "%AppPath%"
:: 2. 极速拦截：在 0.05 秒内把透明度降为 0 (完全隐身)
:: 这一步是为了对付那个“占满全屏”的瞬间
"%NirPath%" cmdwait 50 win trans process "Iceweasel.exe" 0
:: 3. 持续拦截：防止它在初始化中途恢复不透明度
"%NirPath%" cmdwait 500 win trans process "Iceweasel.exe" 0
"%NirPath%" cmdwait 1000 win trans process "Iceweasel.exe" 0
:: 4. 最终收尾：等它稳定后，执行彻底隐藏，并恢复它的透明度（方便下次手动找回时是可见的）
"%NirPath%" cmdwait 2000 win hide process "Iceweasel.exe"
"%NirPath%" win trans process "Iceweasel.exe" 255
echo [完成] 浏览器已通过透明化策略转入后台。
