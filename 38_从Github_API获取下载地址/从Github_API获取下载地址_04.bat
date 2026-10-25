@echo off
setlocal enabledelayedexpansion

:: ================= 配置区域 =================
set "API_URL=https://api.github.com/repos/uutils/coreutils/releases/latest"
set "KEYWORDS=x86_64-pc-windows-msvc"

echo API 地址: %API_URL%
echo 筛选条件: %KEYWORDS%

set "DOWNLOAD_URL="
for /f "delims=" %%I in ('curl -s "%API_URL%" ^| powershell -NoProfile -Command "$j=$input|ConvertFrom-Json;$u=$j.assets.browser_download_url;$k='%KEYWORDS%'-split','|?{$_};if($k){$u=$u|?{$url=$_;$m=$true;foreach($k_ in $k){if($url -notmatch [regex]::Escape($k_)){$m=$false;break}};$m}};$u"') do (
    set "DOWNLOAD_URL=!DOWNLOAD_URL! %%I"
)

echo 解析到的下载地址:
for %%A in (%DOWNLOAD_URL%) do echo %%A

pause

:: 下面可以直接调用 %DOWNLOAD_URL% 进行下载，例如：
curl -L -o "%~dp0coreutils.zip" "%DOWNLOAD_URL%"

在这里补全解压步骤.
解压出来里面是个 coreutils-0.9.0-x86_64-pc-windows-gnu 这种文件夹.
解压后把它改名成 coreutils
里面要是 \coreutils\coreutils.exe
\coreutils\...其他文件...

pause
exit



批量下载


@echo off

:: ================= 配置区域 =================
set "API_URL=https://api.github.com/repos/uutils/coreutils/releases/latest"
set "KEYWORDS="

echo API 地址: %API_URL%
echo 筛选条件: %KEYWORDS%
echo 正在解析并处理下载...

for /f "delims=" %%I in ('curl -s "%API_URL%" ^| powershell -NoProfile -Command "$j=$input|ConvertFrom-Json;$u=$j.assets.browser_download_url;$k='%KEYWORDS%'-split','|?{$_};if($k){$u=$u|?{$url=$_;$m=$true;foreach($k_ in $k){if($url -notmatch [regex]::Escape($k_)){$m=$false;break}};$m}};$u"') do (
    echo 找到目标链接: %%I
    :: 这里可以直接写你的下载逻辑，例如：
    :: curl -L -O "%%I"
)


这两个版本最大的区别在于**编译时使用的 C 语言运行库（CRT）和编译工具链不同**：

| 对比项 | **`-msvc.zip` (推荐)** | **`-gnu.zip`** |
| --- | --- | --- |
| **编译工具链** | Microsoft Visual C++ (MSVC) | GCC / MinGW-w64 |
| **运行时依赖** | 系统原生的 `vcruntime140.dll` / Universal CRT | MinGW 提供的 POSIX 兼容运行时层（如 `libgcc` 等） |
| **Windows 原生集成** | **更好**，对 Windows 系统 API 和路径格式支持更自然 | **稍逊**，会带有部分 Linux 模拟层的行为习惯 |
| **执行效率与体积** | 针对 Windows 做了原生优化，体积通常更小 | 包含更多的 POSIX 兼容性代码，体积极限优化略逊 |

---

### 选哪个？

* **选 `x86_64-pc-windows-msvc**`：
在 Windows 11 下作为日常工具使用，这是**首选和标准版本**。MSVC 编译出来的二进制文件是纯正的 Windows 原生程序，稳定性最高，且已经内置了 Windows 标准 C 运行时。
* **选 `x86_64-pc-windows-gnu**`：
只有当你处于 **MSYS2、MinGW 或 Cygwin** 等类 Unix 终端环境中，并且你的脚本严重依赖类 Unix 特有行为或 GCC 环境链条时，才需要考虑这个版本。