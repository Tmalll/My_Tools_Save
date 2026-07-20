@echo off
title 安装 文件显示切换 右键菜单（全窗口刷新版）
echo.

:: ===== 提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

:: ============================================================
:: 写入 HideExtendName.vbs（扩展名）
:: ============================================================
> "%SystemRoot%\HideExtendName.vbs" (
    echo Dim sh, w
    echo Set sh = CreateObject("WScript.Shell"^)
    echo key = "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\HideFileExt"
    echo On Error Resume Next
    echo val = sh.RegRead(key^)
    echo If val = 0 Then
    echo     sh.RegWrite key, 1, "REG_DWORD"
    echo Else
    echo     sh.RegWrite key, 0, "REG_DWORD"
    echo End If
    echo For Each w In CreateObject("Shell.Application"^).Windows
    echo     w.Refresh
    echo Next
)




:: ============================================================
:: 写入 HideFile.vbs（隐藏文件）
:: ============================================================
> "%SystemRoot%\HideFile.vbs" (
    echo Dim sh, w
    echo Set sh = CreateObject("WScript.Shell"^)
    echo key = "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\Hidden"
    echo On Error Resume Next
    echo val = sh.RegRead(key^)
    echo If val = 1 Then
    echo     sh.RegWrite key, 2, "REG_DWORD"
    echo Else
    echo     sh.RegWrite key, 1, "REG_DWORD"
    echo End If
    echo For Each w In CreateObject("Shell.Application"^).Windows
    echo     w.Refresh
    echo Next
)



echo VBS 写入完成
echo.

:: ============================================================
:: 右键菜单：扩展名
:: ============================================================
reg add "HKCR\Directory\Background\shell\ToggleExt" /ve /d "显示/隐藏 文件扩展名" /f
reg add "HKCR\Directory\Background\shell\ToggleExt" /v Icon /d "imageres.dll,-5302" /f
reg add "HKCR\Directory\Background\shell\ToggleExt\command" /ve /d ^
"wscript.exe \"%SystemRoot%\HideExtendName.vbs\"" /f

:: ============================================================
:: 右键菜单：隐藏文件
:: ============================================================
reg add "HKCR\Directory\Background\shell\ToggleHidden" /ve /d "显示/不显示 隐藏的文件" /f
reg add "HKCR\Directory\Background\shell\ToggleHidden" /v Icon /d "imageres.dll,-5304" /f
reg add "HKCR\Directory\Background\shell\ToggleHidden\command" /ve /d ^
"wscript.exe \"%SystemRoot%\HideFile.vbs\"" /f

echo.
echo ================================
echo 安装完成：
echo  - 已修复刷新问题
echo  - 所有窗口同步更新
echo  - 无需重启 Explorer
echo ================================
pause
