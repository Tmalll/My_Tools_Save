@echo off
setlocal enabledelayedexpansion

:: ===== 配置区域 =====
set "IN=doh_address.txt"
set "OUT=doh_address_ok.txt"
set "MAX_THREADS=10"

set "有效证书="
:: 如果需要跳过证书校验填写 -k, 保留证书校验则留空

set "超时时间=2"
:: curl -m 后面的超时时间

:: ===================

if not exist "%IN%" (
    echo 错误: 找不到输入文件 %IN%
    pause
    exit /b
)

if exist "%OUT%" del "%OUT%"
echo 正在开始并行测试 (并发限制: %MAX_THREADS%)...
echo ---------------------------------------

:: 遍历地址文件
for /f "usebackq tokens=*" %%a in ("%IN%") do (
    set "addr=%%a"

    :: 检查当前运行的 curl 进程数，如果达到限制则等待
    :wait_loop
    set /a count=0
    for /f %%c in ('tasklist /nh /fi "imagename eq curl.exe" ^| find /c "curl.exe"') do set count=%%c
    if !count! geq %MAX_THREADS% (
        timeout /t 1 /nobreak >nul
        goto wait_loop
    )

    :: 启动一个后台进程处理当前地址
    start /b "" cmd /c "exit /b" 
    :: 这里我们调用一个专门处理单个地址的子标签
    call :ProcessAddr "!addr!"
)

echo ---------------------------------------
echo 正在等待最后的任务完成...
:final_wait
tasklist /nh /fi "imagename eq curl.exe" | find "curl.exe" >nul
if !errorlevel! equ 0 (
    timeout /t 1 /nobreak >nul
    goto final_wait
)

echo 测试完成！结果已保存至 %OUT%
pause
exit /b

:: ===== 处理单个地址的子函数 =====
:ProcessAddr
set "this_addr=%~1"
set "isV6=0"
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

:: 启动后台 curl。注意这里使用 start /b 隐藏窗口并行运行
start /b "" cmd /c "echo off && for /f %%s in ('curl -s %有效证书% -m %超时时间% -w "%%%%{http_code}" "!URL!" --output NUL') do if not "%%s"=="000" (echo [成功] !URL! [%%s] ^& echo !URL! >> "%OUT%") else (echo [失败] !URL!)"
goto :eof