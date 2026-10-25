@echo off
setlocal enabledelayedexpansion


:: 第一步：通过 curl 获取 JSON 文件
echo [1/4] 正在获取 JSON 数据...
curl -o mumu_download_URL.json -s -X POST "https://api.mumu.nie.netease.com/api/v2/download/nx" ^
-H "User-Agent: WinHttpClient" ^
--data-urlencode "machine={}"
echo.

if not exist mumu_download_URL.json (
    echo 错误：未能成功下载 JSON 文件！
    pause
    exit /b
)

:: 第二步：获取时间戳
echo [2/4] 正在获取当前日期时间戳...
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set "timestamp=%%i"
echo.
echo 当前时间戳：%timestamp%
echo.

:: 第三步：调用 PowerShell 纯粹提取链接、MD5和原始文件名
echo [3/4] 正在解析 JSON 并配置基础变量...
for /f "delims=" %%i in ('powershell -NoProfile -Command "$json = Get-Content 'mumu_download_URL.json' -Raw | ConvertFrom-Json; $i=1; foreach($c in $json.data.components){$link=$c.link -replace 'http://','https://'; $orig_name=[System.IO.Path]::GetFileName($link); Write-Output ('LINK_0' + $i + '=' + $link); Write-Output ('MD5_0' + $i + '=' + $c.checksum); Write-Output ('ORIG_NAME_0' + $i + '=' + $orig_name); $i++}"') do (
    set "%%i"
)
echo.

:: 第四步：在外部进行时间戳和编号的拼接，组合出最终的文件名
set "NAME_01=%timestamp%_01_%ORIG_NAME_01%"
set "NAME_02=%timestamp%_02_%ORIG_NAME_02%"
set "NAME_03=%timestamp%_03_%ORIG_NAME_03%"

:: 第五步：使用修正后的文件名直接下载
echo [4/4] 正在开始下载文件...
echo.
echo    +++ 正在下载第 1 个文件: %NAME_01% +++
curl -L "%LINK_01%" -o "%NAME_01%" -H "User-Agent: aria2/1.36.0"
echo.

echo    +++ 正在下载第 2 个文件: %NAME_02% +++
curl -L "%LINK_02%" -o "%NAME_02%" -H "User-Agent: aria2/1.36.0"
echo.

echo    +++ 正在下载第 3 个文件: %NAME_03% +++
curl -L "%LINK_03%" -o "%NAME_03%" -H "User-Agent: aria2/1.36.0"
echo.

:: 第六步：对下载的文件进行 MD5 校验
echo --------------------------------------------------
echo [5/4] 开始进行 MD5 文件校验...
echo --------------------------------------------------

:: 校验文件 1
echo 文件1: %NAME_01% 
echo Json_md5: %MD5_01%
if exist "%NAME_01%" (
    for /f %%i in ('powershell -NoProfile -Command "(Get-FileHash '%NAME_01%' -Algorithm MD5).Hash"') do set "CALC_MD5_01=%%i"
    if /i "!CALC_MD5_01!"=="%MD5_01%" (
        echo [ 成功 ] %NAME_01% 校验通过！
    ) else (
        echo [ 失败 ] %NAME_01% 校验不匹配！预期: %MD5_01% 实际: !CALC_MD5_01!
    )
) else ( echo [ 错误 ] 文件不存在: %NAME_01% )
echo.

:: 校验文件 2
echo 文件2: %NAME_02% 
echo Json_md5: %MD5_02%
if exist "%NAME_02%" (
    for /f %%i in ('powershell -NoProfile -Command "(Get-FileHash '%NAME_02%' -Algorithm MD5).Hash"') do set "CALC_MD5_02=%%i"
    if /i "!CALC_MD5_02!"=="%MD5_02%" (
        echo [ 成功 ] %NAME_02% 校验通过！
    ) else (
        echo [ 失败 ] %NAME_02% 校验不匹配！预期: %MD5_02% 实际: !CALC_MD5_02!
    )
) else ( echo [ 错误 ] 文件不存在: %NAME_02% )
echo.

:: 校验文件 3
echo 文件3: %NAME_03% 
echo Json_md5: %MD5_03%
if exist "%NAME_03%" (
    for /f %%i in ('powershell -NoProfile -Command "(Get-FileHash '%NAME_03%' -Algorithm MD5).Hash"') do set "CALC_MD5_03=%%i"
    if /i "!CALC_MD5_03!"=="%MD5_03%" (
        echo [ 成功 ] %NAME_03% 校验通过！
    ) else (
        echo [ 失败 ] %NAME_03% 校验不匹配！预期: %MD5_03% 实际: !CALC_MD5_03!
    )
) else ( echo [ 错误 ] 文件不存在: %NAME_03% )
echo.

echo --------------------------------------------------
echo 脚本执行完毕。
pause