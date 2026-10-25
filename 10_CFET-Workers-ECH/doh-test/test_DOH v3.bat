@echo off
setlocal enabledelayedexpansion

:: ===== 配置区域 =====
set "IN=doh_address.txt"
set "OUT=doh_address_ok.txt"
set "MAX_THREADS=10"

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
echo 正在开始并行测试 (并发限制: %MAX_THREADS%)...
echo ---------------------------------------

for /f "usebackq tokens=*" %%a in ("%IN%") do (
    set "addr=%%a"

    :: 检查当前运行的 curl 进程数
    :wait_loop
    set /a count=0
    for /f %%c in ('tasklist /nh /fi "imagename eq curl.exe" ^| find /c "curl.exe"') do set count=%%c
    if !count! geq %MAX_THREADS% (
        pathping -p 333 -q 1 localhost >nul
        goto wait_loop
    )

    :: 调用子函数处理
    call :ProcessAddr "!addr!"
)

echo ---------------------------------------
echo 所有任务已分派，正在等待最后的任务完成...

:final_wait
tasklist /nh /fi "imagename eq curl.exe" | find "curl.exe" >nul
if !errorlevel! equ 0 (
    pathping -p 333 -q 1 localhost >nul
    goto final_wait
)

echo.
echo 测试完成！结果已保存至 %OUT%
pause
exit /b

:: ===== 处理单个地址的子函数 =====
:ProcessAddr
set "this_addr=%~1"
set "isV6=0"

:: 简单的 IPv6 判断逻辑
if not "!this_addr!"=="!this_addr::=!" (
    if "!this_addr!"=="!this_addr:.=!" (
        set "isV6=1"
    )
)

if "!isV6!"=="1" (
    set "URL=https://[!this_addr!]/dns-query"
) else (
    set "URL=https://!this_addr!/dns-query"
)

:: 核心修复：直接将变量内容嵌入字符串，并确保 cmd /c 的内容被双引号正确包裹
:: 我们在 start 内部使用变量的具体值，而不是引用 %TIMEOUT%
start /b "" cmd /c "echo off ^&^& for /f %%s in ('curl -s %VALID_CERT% -m %TIMEOUT% -w "%%{http_code}" "!URL!" --output NUL') do (if not "%%s"=="000" (echo [成功] !URL! [%%s] ^& echo !URL! >> "%OUT%") else (echo [失败] !URL!))"

:: 给系统一点喘息时间，防止 start 过快导致进程 ID 冲突
pathping -p 333 -q 1 localhost >nul
goto :eof