@echo off
:: ======================== 【自定义配置区域】 ========================
:: 1. 自定义扩展程序名称（可自由修改，生成 manifest 时会自动引用）
SET "EXTENSION_NAME=Open URL in Google Chrome"

:: 2. 自定义协议头名称
SET "PROTOCOL_NAME=open-GoogleChrome"

:: 3. 目标浏览器的绝对路径（修改这里即可灵活切换 Thorium / Chrome1 / Chrome2 等）
SET "TARGET_BROWSER=D:\01.Program_Soft\01-浏览器\02.GoogleChrome\Chrome-bin\chrome.exe"

:: =====================================================================

:: 自动获取当前脚本 nitrate 所在目录
SET "CURRENT_DIR=%~dp0"
SET "TARGET_VBS=%CURRENT_DIR%silent_run.vbs"
SET "TARGET_MANIFEST=%CURRENT_DIR%manifest.json"
SET "TARGET_BG_JS=%CURRENT_DIR%background.js"

echo 【1/5】正在静默清理旧的系统注册表...
del /q "%TARGET_VBS%"
del /q "%TARGET_MANIFEST%"
del /q "%TARGET_BG_JS%"

reg delete "HKCU\Software\Classes\%PROTOCOL_NAME%" /f >nul 2>nul

echo 【2/5】正在动态生成前端扩展配置文件 (manifest.json)...
:: chcp 65001 >nul
(
    echo {
    echo   "manifest_version": 3,
    echo   "name": "%EXTENSION_NAME%",
    echo   "version": "1.1",
    echo   "description": "%EXTENSION_NAME%",
    echo   "permissions": [
    echo     "activeTab",
    echo     "tabs"
    echo   ],
    echo   "action": {
    echo     "default_title": "%EXTENSION_NAME%"
    echo   },
    echo   "background": {
    echo     "service_worker": "background.js"
    echo   }
    echo }
) > "%TARGET_MANIFEST%"
:: chcp 936 >nul

echo 【3/5】正在动态生成前端扩展后台脚本 (background.js)...
(
    echo chrome.action.onClicked.addListener^((tab^) =^> {
    echo   if ^(!tab.url^) return;
    echo   if ^(tab.url.startsWith^('http://'^) ^|^| tab.url.startsWith^('https://'^)^) {
    echo     let targetUrl = '%PROTOCOL_NAME%://' + tab.url;
    echo     chrome.tabs.update^(tab.id, { url: targetUrl ^}^);
    echo   }
    echo }^);
) > "%TARGET_BG_JS%"

echo 【4/5】正在动态生成全自动 VBS 隐藏筛选垫片 (silent_run.vbs)...
(
    echo Set ws = CreateObject^("Wscript.Shell"^)
    echo Set regEx = New RegExp
    echo regEx.Pattern = "https?://.*"
    echo regEx.IgnoreCase = True
    echo If Wscript.Arguments.Count ^> 0 Then
    echo     rawUrl = Wscript.Arguments^(0^)
    echo     Set matches = regEx.Execute^(rawUrl^)
    echo     If matches.Count ^> 0 Then
    echo         cleanUrl = matches^(0^).Value
    echo         ' 去除可能携带的末尾斜杠或引号污染
    echo         If Right^(cleanUrl, 1^) = "/" Then cleanUrl = Left^(cleanUrl, Len^(cleanUrl^) - 1^)
    echo         If Right^(cleanUrl, 1^) = """" Then cleanUrl = Left^(cleanUrl, Len^(cleanUrl^) - 1^)
    echo         ' VBS 彻底隐藏黑框拉起目标浏览器
    echo         ws.Run """%TARGET_BROWSER%"" --url """ ^& cleanUrl ^& """", 0, False
    echo     End If
    echo End If
) > "%TARGET_VBS%"

echo 【5/5】正在使用纯单行 PowerShell 写入自定义协议注册表...
SET "REG_COMMAND=wscript.exe \"%TARGET_VBS%\" \"%%1\""
powershell -NoProfile -ExecutionPolicy Bypass -Command "$rootPath = 'HKCU:\Software\Classes\%PROTOCOL_NAME%'; if (!(Test-Path $rootPath)) { [void](New-Item -Path $rootPath -Force) }; [void](New-ItemProperty -Path $rootPath -Name '(Default)' -Value 'URL:%PROTOCOL_NAME% Protocol' -PropertyType String -Force); [void](New-ItemProperty -Path $rootPath -Name 'URL Protocol' -Value '' -PropertyType String -Force); $cmdPath = \"$rootPath\shell\open\command\"; if (!(Test-Path $cmdPath)) { [void](New-Item -Path $cmdPath -Force) }; [void](New-ItemProperty -Path $cmdPath -Name '(Default)' -Value '%REG_COMMAND%' -PropertyType String -Force)"

echo.
echo ======================== 【写入结果核对】 ========================
powershell -NoProfile -ExecutionPolicy Bypass -Command "$cmdPath = 'HKCU:\Software\Classes\%PROTOCOL_NAME%\shell\open\command'; if (Test-Path $cmdPath) { echo '成功读取到目标注册表内容如下：'; (Get-ItemProperty -Path $cmdPath).'(Default)' } else { Write-Error '未能在注册表中找到该路径，请检查写入日志。' }"
echo =====================================================================
echo.

pause