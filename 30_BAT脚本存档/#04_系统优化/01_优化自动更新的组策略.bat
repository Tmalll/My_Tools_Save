@echo off

:: ===== 自动提权 =====
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: ===== Windows Update 延迟策略 =====

:: 质量更新延迟 30 天
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" ^
 /v DeferQualityUpdates /t REG_DWORD /d 1 /f

reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" ^
 /v DeferQualityUpdatesPeriodInDays /t REG_DWORD /d 30 /f


:: 功能更新延迟 365 天
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" ^
 /v DeferFeatureUpdates /t REG_DWORD /d 1 /f

reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" ^
 /v DeferFeatureUpdatesPeriodInDays /t REG_DWORD /d 365 /f


:: 禁止接收驱动更新
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" ^
 /v ExcludeWUDriversInQualityUpdate /t REG_DWORD /d 1 /f


:: 可选：关闭预览版更新（推荐）
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" ^
 /v ManagePreviewBuilds /t REG_DWORD /d 1 /f

reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" ^
 /v ManagePreviewBuildsPolicyValue /t REG_DWORD /d 1 /f


gpupdate /force



pause
exit



