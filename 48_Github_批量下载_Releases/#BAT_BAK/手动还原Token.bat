@echo off
setlocal enabledelayedexpansion

echo Token还原后为:
echo.
echo Z2l0aHViX3BhdF8xMUFKU1VXSlEwOGVRQ1hnZ1l0Mnc5X2cyc0d3TVU3SWV5dE1zSThpVjQ1a2o2RUlRVDZocEcwcnJFZ2dkc0NBbU5SSUdSWVFFWDZraTd1UEhaIA0K | base64 -d
echo.


:: 配置参数

SET /P TokenRestored=请输入已还原的Token:

set "TOKEN=%Tokenrestored%"

echo %TOKEN%


pause






set "OWNER=XTLS"
set "REPO=Xray-core"


:: 指定 aria2-list.txt 的保存绝对路径
set "ARIA_PATH=%~dp0aria2-list.txt"

:: 自动组合仓库全名和创建Json存放文件夹
set "reposName=%OWNER%/%REPO%"
set "JSON_DIR=%OWNER%_%REPO%_releases_json"
if not exist "%JSON_DIR%" mkdir "%JSON_DIR%"

:: 设置你的 GitHub Token
set "github_token=%TOKEN%"

:: 构造 Authorization 请求头 (如果有 Token)
set "auth_header="
if not "%github_token%"=="" set "auth_header=-H "Authorization: Bearer %github_token%""

:: 提前定义好 URL 后缀，避开循环内 Exclamation (!) 符号被延迟扩展吞掉的巨坑
set "url_suffix=&per_page=100"

:: 循环抓取 1 到 1000 页
for /L %%I in (1, 1, 1000) do (
    
    :: 生成对齐的补零文件名 (001-999, 1000)
    if %%I lss 1000 (
        set "num=00%%I"
        set "page_str=!num:~-3!"
    ) else (
        set "page_str=%%I"
    )

    echo Downloading page %%I ^(!page_str!^)...
    
    :: 执行下载，保存到指定项目文件夹中，并将接口改为 releases
    curl -s -L %auth_header% -H "User-Agent: Mozilla/5.0" "https://api.github.com/repos/%reposName%/releases?page=%%I!url_suffix!" -o "%JSON_DIR%\releases_page_!page_str!.json"
    
    :: 实时判定
    if exist "%JSON_DIR%\releases_page_!page_str!.json" (
        for %%A in ("%JSON_DIR%\releases_page_!page_str!.json") do (
            if %%~zA leq 5 (
                echo [INFO] Page %%I is empty. Stopping download process.
                goto :skip_remaining
            )
        )
    )
)

:skip_remaining
echo.
echo Download process finished.
echo.

:: ------------------ 放在最后的清理逻辑 ------------------
echo Cleaning up empty files...
powershell -NoProfile -Command "Get-ChildItem -LiteralPath '%JSON_DIR%' -Filter 'releases_page_*.json' | Where-Object { $_.Length -le 5 } | Remove-Item -Force"
echo.
echo Cleaning up empty files finished.
echo.
echo [提示] 顺序抓取结束。
echo.


:end_tags_loop

echo.
echo 解析 Json 并生成 aria2-list.txt
echo Processing JSON files and generating aria2-list.txt
echo.

powershell -NoProfile -Command "Remove-Item '%ARIA_PATH%' -ErrorAction SilentlyContinue; Get-ChildItem -LiteralPath '%JSON_DIR%' -Filter 'releases_page_*.json' | ForEach-Object { $text=[System.IO.File]::ReadAllText($_.FullName); if($text.Trim().Length -gt 5){ $objs=[array](ConvertFrom-Json $text); $lines=[System.Collections.Generic.List[string]]::new(); foreach($r in $objs){ if($r.tag_name){ $tag=$r.tag_name; $dir='%REPO%\'+$tag; foreach($a in $r.assets){ $lines.Add($a.browser_download_url); $lines.Add('  dir='+$dir); $lines.Add('  out='+$a.name); if($a.digest){ $lines.Add('  checksum=' + $a.digest.Replace('sha256:', 'sha-256=')) } else { $lines.Add('') }; $lines.Add('') } } }; if($lines.Count -gt 0){ [System.IO.File]::AppendAllLines('%ARIA_PATH%', $lines) } } }"


echo Done.
pause