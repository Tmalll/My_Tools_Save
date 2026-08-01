@echo off
setlocal enabledelayedexpansion

:: 设置文件名
set "IN=doh_address.txt"
set "OUT=doh_address_ok.txt"

if not exist "%IN%" (
    echo 错误: 找不到输入文件 %IN%
    pause
    exit /b
)

if exist "%OUT%" del "%OUT%"

echo 正在开始 DoH 地址测试 (不使用管道符安全模式)...
echo ---------------------------------------

for /f "usebackq tokens=*" %%a in ("%IN%") do (
    set "addr=%%a"
    
    :: --- 纯字符逻辑判断 (避免使用 FIND 命令和管道符) ---
    set "isV6=0"
    :: 如果地址包含冒号
    if not "!addr!"=="!addr::=!" (
        :: 如果地址不包含点
        if "!addr!"=="!addr:.=!" (
            set "isV6=1"
        )
    )

    :: 补全 URL
    if "!isV6!"=="1" (
        set "URL=https://[!addr!]/dns-query"
    ) else (
        set "URL=https://!addr!/dns-query"
    )

    echo 正在测试: !URL!
    
    :: 执行测试：改用 --output NUL (大写) 有时在旧版 Windows 更兼容
    set "status=000"
    for /f %%s in ('curl -s -m 3 -w "%%{http_code}" "!URL!" --output NUL') do (
        set "status=%%s"
    )

    :: 判定成功：只要不是 000 都算通
    if not "!status!"=="000" (
        echo [成功] 状态码: !status!
        echo !URL! >> "%OUT%"
    ) else (
        echo [失败] 无法连接
    )
)

echo ---------------------------------------
echo 测试完成！结果已保存至 %OUT%
pause