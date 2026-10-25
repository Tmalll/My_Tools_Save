:: 禁止接收驱动更新
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" ^
 /v ExcludeWUDriversInQualityUpdate /t REG_DWORD /d 0 /f