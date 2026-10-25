@echo off
set "OutputFile=%~dp0ServiceList.csv"

echo 正在导出并排序（自动-手动-禁用），请稍候...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$all = Get-CimInstance Win32_Service; Get-Service | Select-Object @{N='状态';E={if($_.StartType -eq 'Automatic'){'自动'}elseif($_.StartType -eq 'Manual'){'手动'}else{'禁用'}}}, @{N='P';E={if($_.StartType -eq 'Automatic'){1}elseif($_.StartType -eq 'Manual'){2}else{3}}}, @{N='显示名称';E={$_.DisplayName}}, @{N='服务名称';E={$_.Name}}, @{N='描述';E={$s=$_.Name; ($all | Where-Object Name -eq $s).Description}} | Sort-Object P, 显示名称 | Select-Object 状态, 显示名称, 服务名称, 描述 | Export-Csv -Path '%OutputFile%' -NoTypeInformation -Encoding Default"

if %errorlevel% equ 0 (
    echo.
    echo 导出成功！
    echo 文件保存在: "%OutputFile%"
) else (
    echo.
    echo 导出失败，请尝试【右键 - 以管理员身份运行】。
)
pause