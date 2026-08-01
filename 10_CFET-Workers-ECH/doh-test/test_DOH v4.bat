@echo off
setlocal enabledelayedexpansion

:: ===== 配置区域 =====
set "IN=doh_address.txt"
set "OUT=doh_address_ok.txt"

:: 如果需要跳过证书校验填写 -k, 保留证书校验则留空
set "VALID_CERT="
:: curl -m 后面的超时时间
set "TIMEOUT=2"
:: ===================

if not exist "%IN%" (
    echo 错误: 找不到输入文件 %IN%
    pause
    exit /b
)

if exist "%OUT%" del "%OUT%"
echo 正在启动全量并行测试 (不限进程数)...
echo ---------------------------------------

:: 直接遍历并启动，不进行任何等待
for /f "usebackq tokens=*" %%a in ("%IN%") do (
    set "addr=%%a"
    
    :: IPv6 判断逻辑
    set "isV6=0"
    if not "!addr!"=="!addr::=!" (
        if "!addr!"=="!addr:.=!" (
            set "isV6=1"
        )
    )

    if "!isV6!"=="1" (
        set "URL=https://[!addr!]/dns-query"
    ) else (
        set "URL=https://!addr!/dns-query"
    )

    :: 每一行直接 start，不检查进程数
    pathping -p 50 -q 1 localhost >nul
    start /b "" cmd /c "echo off ^&^& for /f %%s in ('curl -s %VALID_CERT% -m %TIMEOUT% -w "%%{http_code}" "!URL!" --output NUL') do (if not "%%s"=="000" (echo [成功] !URL! [%%s] ^& echo !URL! >> "%OUT%") else (echo [失败] !URL!))"

)

:: 计算等待时间
set /a "WAIT_TIME=TIMEOUT+3"
timeout /t %WAIT_TIME% /nobreak >nul

echo ---------------------------------------
echo 测试完成！结果已保存至: %OUT%
pause

