cd /d "%~dp0" & title %~nx0

set "output_target=%~dp0后台任务.csv"

powershell -Command "Get-CimInstance Win32_Process | Select-Object @{Name='进程名称';Expression={$_.Name}}, @{Name='ID';Expression={$_.ProcessId}}, @{Name='父ID';Expression={$_.ParentProcessId}}, @{Name='命令行参数';Expression={$_.CommandLine}} | Export-Csv -Path '%output_target%' -NoTypeInformation -Encoding UTF8"



pause
exit

