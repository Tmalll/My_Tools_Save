@ECHO OFF
SETLOCAL ENABLEDELAYEDEXPANSION

:: 1. 切换目录
PUSHD "%~DP0"

:: 2. 变量定义
SET "REAL_EXE=%~dp0PRbin\thunderbird.exe"
SET "VBS_LAUNCHER=%~dp0thunderbird启动器.vbs"
SET "LNK_NAME=ThunderBird.lnk"
SET "ARGS="

:: 3. 生成启动器 VBS (回归最稳的格式)
(
    echo Set shell = CreateObject("WScript.Shell"^)
    echo exePath = Chr(34^) ^& "%REAL_EXE%" ^& Chr(34^)
    echo args = "%ARGS%"
    echo shell.Run exePath ^& " " ^& args, 3, False
) > "%VBS_LAUNCHER%"

:: 此处的 ... args, 3, False ...
:: 这里的数字, 0表示隐藏, 1正常显示大小, 3最大化显示.
:: 如果你希望双击后直接看到 Thunderbird 的窗口，你需要把运行参数从 0 改为 1（正常大小显示）或 3（最大化显示）。
:: 数值,对应的窗口状态,适用场景
:: 0,隐藏窗口，并激活另一个窗口。,适合后台运行静默脚本、备份任务、或不想让用户看见的命令行工具。
:: 1,正常显示并激活窗口。,最常用的标准启动方式。如果窗口之前是最小化或最大化，会还原到初始大小。
:: 2,激活窗口并将其显示为最小化。,适合那些你想让它启动，但不想让它挡住当前屏幕视线的程序（直接进任务栏）。
:: 3,激活窗口并将其显示为最大化。,适合浏览器、邮件客户端、IDE 等需要全屏工作的重度生产力软件。
:: 4,以最近的大小和位置显示窗口。,与 1 类似，但不会激活该窗口，当前活动窗口依然保持焦点。
:: 5,激活窗口并以当前大小和位置显示。,强制让窗口接管当前的焦点和位置。
:: 6,最小化指定窗口。,启动后立即最小化，并激活窗口列表中的下一个顶部窗口。
:: 7,将窗口显示为最小化。,与 2 类似，但不会激活该窗口，当前活动窗口依然保持焦点。
:: 8,以当前状态显示窗口。,与 5 类似，但不会激活该窗口，当前活动窗口保持焦点。
:: 9,还原并激活窗口。,如果窗口被最小化或最大化，Windows 会将其恢复到其原始大小和位置。在激活处于最小化状态的窗口时，应该使用此标志。
:: 10,根据启动程序的默认状态显示。,依据启动该应用的父进程所设置的 STARTUPINFO 结构来决定状态。



:: 4. 创建桌面快捷方式 (带删除及 2 秒等待，精准识别桌面)
(
    echo Set sh = CreateObject("WScript.Shell"^)
    echo Set fso = CreateObject("Scripting.FileSystemObject"^)
    echo desk = sh.SpecialFolders("Desktop"^)
    echo lnk = desk ^& "\%LNK_NAME%"
    echo.
    echo ' --- 先执行清理 ---
    echo If fso.FileExists(lnk^) Then
    echo     fso.DeleteFile lnk, True
    echo     WScript.Sleep 2000
    echo End If
    echo.
    echo ' --- 再执行创建 ---
    echo Set sc = sh.CreateShortcut(lnk^)
    echo sc.TargetPath = "%VBS_LAUNCHER%"
    echo sc.WorkingDirectory = "%~dp0Application\"
    echo sc.IconLocation = "%REAL_EXE%,0"
    echo sc.Save
) > "%TEMP%\final_lnk.vbs"

cscript //B //Nologo "%TEMP%\final_lnk.vbs"
del /f /q "%TEMP%\final_lnk.vbs" >nul 2>&1

ECHO.
ECHO ----------------------------------------------------
ECHO  [完成] 
ECHO  1. 启动器 VBS 已生成 (回归原版启动逻辑)
ECHO  2. 桌面快捷方式已刷新 (包含删除及 2s 缓冲)
ECHO ----------------------------------------------------
TIMEOUT /t 3
EXIT