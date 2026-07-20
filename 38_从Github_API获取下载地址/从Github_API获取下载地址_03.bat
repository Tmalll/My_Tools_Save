@echo off
:: 取消了 chcp 65001，保持系统默认的 ANSI 编码环境

:: ================= 配置区域 =================
:: 1. GitHub API 地址
:: Latest | set "API_URL=https://api.github.com/repos/XTLS/Xray-core/releases/latest"
:: 某个tag, 比如: https://github.com/XTLS/Xray-core/releases/tag/v26.6.27
:: set "API_URL=https://api.github.com/repos/XTLS/Xray-core/releases/tags/v26.6.27"
:: 注意事项, 拼接时tag > tags
set "API_URL=https://api.github.com/repos/uutils/coreutils/releases/latest"

:: 2. 指定输出文件路径 (当前脚本同目录下)
set "OUTPUT_FILE=%~dp0Github_URL_output.txt"

:: 3. 指定筛选条件 (多个条件用英文逗号 , 隔开)
:: set "KEYWORDS=windows,amd64.exe"
set "KEYWORDS="

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
:: 3. PowerShell 将逗号分隔的关键词转为数组，利用 Where-Object 循环比对
:: 4. 结果通过 Out-File -Encoding ascii 写入，生成标准 ANSI 文本
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
        "} | Out-File -FilePath '%OUTPUT_FILE%' -Encoding ascii" ^
    "} else {" ^
        "$urls | Out-File -FilePath '%OUTPUT_FILE%' -Encoding ascii" ^
    "}"

:: 检查是否成功生成文件并展示结果
if exist "%OUTPUT_FILE%" (
    echo.
    echo 提取成功！已保存到文件。以下是文件内容：
    echo.
    echo ----------------------------------------------------------
    type "%OUTPUT_FILE%"
    echo.
    echo ----------------------------------------------------------
) else (
    echo.
    echo 提示：没有找到匹配条件的下载地址，或未生成文件。
)

echo.
echo ==========================================================
pause