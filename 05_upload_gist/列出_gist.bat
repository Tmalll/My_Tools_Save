:: 设置窗口大小
mode con: cols=80 lines=20
powershell -Command "$h = Get-Host; $ui = $h.UI.RawUI; $ui.BufferSize = New-Object System.Management.Automation.Host.Size($ui.BufferSize.Width, 9999)"

:: 设置代理服务器
set http_proxy=socks5h://192.168.1.40:10800
set https_proxy=%http_proxy%
set HTTP_PROXY=%http_proxy%
set HTTPS_PROXY=%http_proxy%

gh gist list
cmd /k
