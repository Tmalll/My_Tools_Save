@echo off
title 安装 重启资源管理器 右键菜单（精简增强版）
echo.

:: ===== 提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

:: ============================================================
:: 写入 RestartExplorer.vbs
:: ============================================================
> "%SystemRoot%\RestartExplorer.vbs" (
    echo Dim sh, i, ret
    echo Set sh = CreateObject("WScript.Shell"^)
    echo.
    echo ret = MsgBox("确定要重启资源管理器吗？", 4 + 32, "重启 Explorer"^)
    echo.
    echo ' 只有点“是”才执行
    echo If ret = 6 Then
    echo     On Error Resume Next
    echo.
    echo     ' 1秒内强杀5次
    echo     For i = 1 To 5
    echo         sh.Run "taskkill /f /im explorer.exe", 0, True
    echo         WScript.Sleep 200
    echo     Next
    echo.
    echo     ' 重启 Explorer
    echo     sh.Run "explorer.exe", 0, False
    echo End If
    echo.
    echo Set sh = Nothing
)

echo VBS 写入完成
echo.

:: ============================================================
:: 添加右键菜单
:: ============================================================
reg add "HKCR\Directory\Background\shell\RestartExplorer" /ve /d "重启资源管理器" /f
reg add "HKCR\Directory\Background\shell\RestartExplorer" /v Icon /d "shell32.dll,131" /f
reg add "HKCR\Directory\Background\shell\RestartExplorer\command" /ve /d ^
"wscript.exe \"%SystemRoot%\RestartExplorer.vbs\"" /f

echo.
echo ================================
echo 已添加：
echo  - 图标：红叉（shell32,131）
echo  - 1秒强杀（5次）
echo  - 带确认提示
echo ================================
pause
