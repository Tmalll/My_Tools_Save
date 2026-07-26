@echo off
cd /d "%~dp0" & title %~nx0

title [mihomo.exe] 运行中.........
echo [mihomo.exe] 运行中.........

echo 结束后台程序...
taskkill /f /t /im #mihomo.exe
taskkill /f /t /im #mihomo.exe
taskkill /f /t /im #mihomo.exe
timeout /t 1 > NUL
echo.

echo 设置变量...
set "PRpath=%~dp0#core_and_data\#mihomo.exe"
set "configDIR=%~dp0#core_and_data"
echo.


echo 清理日志...
del /q "%~dp0mihomo_RunLOG.log"
timeout /t 1 > NUL
rem echo.
rem echo. >> "%~dp0\mihomo_RunLOG.log"
rem echo. >> "%~dp0\mihomo_RunLOG.log"
rem echo. >> "%~dp0\mihomo_RunLOG.log"

echo 获取时间戳...
for /f "delims=" %%i in ('powershell -command "Get-Date -Format 'yyyy-MM-dd(HH.mm.ss)'"') do set "TIMESTAMP=%%i"
echo 当前时间为: %TIMESTAMP%
echo.


echo 运行主体程序...

set SKIP_SYSTEM_IPV6_CHECK=1

:: 带日志过滤的启动, git的Grep实现方式
"%PRpath%" -f "%~dp0\config.yml" -d "%configDIR%" -ext-ui "%configDIR%\webui" | grep -E --line-buffered -v "Auto detect interface|REJECT-DROP|GeoSite|using HidePROXY|using DNS_select|get empty name|interface not found|]:445|to avoid lookback|using DIRECT|may not have any sent data|i/o timeout|context deadline exceeded" > "%~dp0mihomo_RunLOG.log"
echo.
:: 这里使用了git的grep做排除了, 需要把C:\Program Files\Git\usr\bin添加到系统变量.

:: 带日志过滤的启动, Powershell实现方式
rem "%PRpath%" -f "%~dp0\config.yml" -d "%configDIR%" -ext-ui "%configDIR%\webui" | powershell -NoProfile -Command "$input | ? { $_ -notmatch 'REJECT-DROP|GeoSite|using HidePROXY|using DNS_select|get empty name|interface not found|\]:445|to avoid lookback|using DIRECT|may not have any sent data|i/o timeout' }" > "E:\01.userData\ZhuoMian\mihomo_RunLOG_%TIMESTAMP%.log"

echo.
echo.
echo.
echo 程序已被结束...
echo 3秒后退出...
timeout /t 3
echo.
echo.
echo.

exit

:: ============================================================
:: Mihomo (Clash.Meta) 命令行参数说明
:: ============================================================

:: -config [string]       指定 Base64 编码的配置字符串 (用于直接从内存读取配置)
:: -d [string]            设置配置目录 (存放 config.yaml, 数据库, 规则等文件的文件夹)
:: -ext-ctl [string]      覆盖外部控制地址 (例如 127.0.0.1:9090，用于面板连接)
:: -ext-ctl-pipe [string] 覆盖 Windows 命名管道控制器地址
:: -ext-ctl-unix [string] 覆盖 Unix 域套接字控制器地址
:: -ext-ui [string]       覆盖外部 UI (仪表盘) 所在的目录路径
:: -f [string]            指定配置文件路径 (相对于 -d 目录或绝对路径)
:: -m                     启用 Geodata 模式 (使用 geoip.dat 和 geosite.dat)
:: -post-down [string]    设置程序关闭后执行的脚本
:: -post-up [string]      设置程序启动后执行的脚本
:: -secret [string]       覆盖 API 访问密钥 (RESTful API 的验证密码)
:: -t                     测试配置文件语法是否正确，并显示结果后退出
:: -v                     显示当前 Mihomo 核心的版本号

:: ------------------------------------------------------------
:: 脚本用法示例:
:: mihomo.exe -d . -f config.yaml
:: ------------------------------------------------------------











