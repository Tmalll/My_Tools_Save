@echo off

:: 1. GitHub API 地址
set "API_URL=https://api.github.com/repos/apernet/hysteria/releases/tags/v1.3.5"

:: 2. 指定输出文件路径 (当前脚本同目录下)
set "OUTPUT_FILE=%~dp0GH_output.txt"

:: 3. 指定筛选条件 (多个条件用英文逗号 , 隔开)
:: 例如：想同时包含 windows 和 amd64，就写 "windows,amd64"
:: 如果不想筛选（输出全部），请保持留空，即：set "KEYWORDS="
set "KEYWORDS=windows,amd64"
:: ============================================

echo ==================== 开始获取下载地址 ====================
echo API 地址: %API_URL%
echo 筛选条件: %KEYWORDS%
echo 输出路径: %OUTPUT_FILE%
echo ----------------------------------------------------------

:: 清理旧的输出文件（如果存在）
if exist "%OUTPUT_FILE%" del "%OUTPUT_FILE%"

:: 核心执行步骤：
:: 1. 用 curl 获取 JSON 数据
:: 2. 传给 PowerShell 
:: 3. PowerShell 将逗号分隔的关键词转为数组，利用 Where-Object 循环比对，必须【同时满足】所有关键词才放行
:: 4. 结果直接重定向写入到指定的输出文件中
curl -s "%API_URL%" | powershell -NoProfile -Command ^
    "$inputJson = $input | ConvertFrom-Json;" ^
    "$urls = $inputJson.assets.browser_download_url;" ^
    "$keys = '%KEYWORDS%' -split ',' | Where-Object { $_ -ne '' };" ^
    "if ($keys) {" ^
        "$urls | Where-Object { " ^
            "$url = $_; " ^
            "$matchAll = $true; " ^
            "foreach ($k in $keys) { if ($url -notmatch [regex]::Escape($k)) { $matchAll = $false; break } }; " ^
            "$matchAll " ^
        "} | Out-File -FilePath '%OUTPUT_FILE%' -Encoding utf8" ^
    "} else {" ^
        "$urls | Out-File -FilePath '%OUTPUT_FILE%' -Encoding utf8" ^
    "}"

:: 检查是否成功生成文件并展示结果
if exist "%OUTPUT_FILE%" (
    echo.
    echo 提取成功！已保存到文件。以下是文件内容：
    echo ----------------------------------------------------------
    type "%OUTPUT_FILE%"
    echo ----------------------------------------------------------
) else (
    echo.
    echo 提示：没有找到匹配条件的下载地址，或未生成文件。
)

echo.
echo ==========================================================
pause