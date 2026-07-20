@ECHO OFF

:: 1. 提权并锁定当前目录
PUSHD "%~DP0"

:: 主要变量
set "Target=chrome.exe"
set "launcher_name=Chrome"
set "dirPath=%~dp0Chrome-bin\

:: 3. 变量准备（强制长路径）
for %%I in ("%dirPath%%Target%") do set "REAL_EXE=%%~fI"
for %%I in ("%dirPath%%launcher_name%-启动器.vbs") do set "VBS_LAUNCHER=%%~fI"
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "(Get-Item -LiteralPath '%REAL_EXE%').FullName"`) do set "REAL_EXE_LONG=%%I"

:: 快捷方式名称
SET "LNK_NAME=%launcher_name%.lnk"

:: 附加启动参数
SET "ARGS=--no-first-run --disable-component-update --disable-crash-reporter --disable-breakpad --disable-logging --no-report-upload --disable-background-updates --disable-features=PrintCompositorLPAC --force-renderer-accessibility=basic --disable-software-rasterizer"


:: 生成启动器
(
    echo Set shell = CreateObject("WScript.Shell"^)
    echo exePath = Chr(34^) ^& "%REAL_EXE_LONG%" ^& Chr(34^)
    echo args = "%ARGS%"
    echo shell.Run exePath ^& " " ^& args, 0, False
)>"%VBS_LAUNCHER%"

:: 5. 精准投放到桌面 (含旧快捷方式清理)
(
    echo Set sh = CreateObject("WScript.Shell"^)
    echo Set fso = CreateObject("Scripting.FileSystemObject"^)
    echo desktop = sh.SpecialFolders("Desktop"^)
    echo lnkPath = desktop ^& "\%LNK_NAME%"
    echo If fso.FileExists(lnkPath^) Then
    echo     fso.DeleteFile lnkPath, True
    echo     WScript.Sleep 1000
    echo End If
    echo Set sc = sh.CreateShortcut(lnkPath^)
    echo sc.TargetPath = "%VBS_LAUNCHER%"
    echo sc.WorkingDirectory = "%dirPath%"
    echo sc.IconLocation = "%REAL_EXE%,0"
    echo sc.Save
)>"%TEMP%\create_lnk.vbs"

cscript //B //Nologo "%TEMP%\create_lnk.vbs"
del /f /q "%TEMP%\create_lnk.vbs" > NUL 2>&1

ECHO.
ECHO 快捷方式已投放桌面。
TIMEOUT /t 3
EXIT