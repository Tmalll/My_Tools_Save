@echo off
setlocal enabledelayedexpansion

:: ===== 配置区域 =====
:: 如果需要跳过证书校验填写 -k, 保留证书校验则留空
set "VALID_CERT="
:: curl -m 后面的超时时间
set "TIMEOUT=2"
:: ===================

echo 正在启动全量并行测试...
echo ---------------------------------------

:: 遍历当前目录下所有以 doh_address_input_ 开头的 txt 文件
for %%F in ("doh_address_input_*.txt") do (
    set "IN=%%~nxF"
    :: 将文件名中的 _input_ 替换为 _output_ 得到输出文件名
    set "OUT=!IN:_input_=_output_!"
    
    if exist "!OUT!" del "!OUT!"

    for /f "usebackq tokens=*" %%a in ("!IN!") do (
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

        :: 保持你原有的并行测试逻辑
        pathping -p 100 -q 1 localhost >nul
        start /b "" cmd /c "echo off ^&^& for /f %%s in ('curl -s %VALID_CERT% -m %TIMEOUT% -w "%%{http_code}" "!URL!" --output NUL') do (if not "%%s"=="000" (echo [成功] !URL! [%%s] ^& echo !URL! >> "!OUT!") else (echo [失败] !URL!))"
    )
)

:: 计算等待时间
set /a "WAIT_TIME=TIMEOUT+3"
timeout /t %WAIT_TIME% /nobreak >nul

echo ---------------------------------------
echo 测试完成！
pause