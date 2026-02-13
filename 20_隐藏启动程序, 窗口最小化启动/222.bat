
cls
taskkill /f /t /im Iceweasel.exe 
set "AppPath=D:\01.Program_Soft\01-浏览器\03.Firefox\Iceweasel_FirefoxPlus\Iceweasel_x64\App\Iceweasel.exe"
set "NirPath=E:\01.userData\ZhuoMian\#CentDL\nircmd.exe"
:: 1. 预设打击：在程序启动前，先告诉系统：如果看到 MozillaWindowClass（Firefox内核通用类名），直接隐藏
:: 这是一种“守株待兔”的策略
"%NirPath%" win hide class "MozillaWindowClass"
:: 2. 强力启动：使用 exec mdshow 参数 (以隐藏模式尝试启动)
"%NirPath%" exec mdshow "%AppPath%"
:: 3. 极速拦截：针对主进程 PID (通过类名打击最精准)
:: Firefox 的主窗口类名几乎都是 MozillaWindowClass
"%NirPath%" win setitrans class "MozillaWindowClass" 0
"%NirPath%" win hide class "MozillaWindowClass"
:: 4. 持续 1.5 秒的高频封锁（解决初始化中途弹出的问题）
"%NirPath%" cmdwait 100 win hide class "MozillaWindowClass"
"%NirPath%" cmdwait 500 win hide class "MozillaWindowClass"
"%NirPath%" cmdwait 1000 win hide class "MozillaWindowClass"
:: 5. 最后恢复透明度但保持隐藏
"%NirPath%" win setitrans class "MozillaWindowClass" 255
echo [调试完成] 进程已建立。请检查任务栏是否还有图标，以及任务管理器进程是否存在。

