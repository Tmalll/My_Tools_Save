Windows XP 在新版 VMware 中出现音频“爆音”（卡顿、有杂音、撕裂感）是比较常见的问题，通常是因为新版虚拟机的**默认音频驱动类型**与 XP 的兼容性不好，或者**音频缓冲区过小**导致的。

可以通过以下几种方法来彻底解决：

### 方法一：修改虚拟机配置文件（最有效）

通过添加两行参数，可以增大音频缓冲区，彻底解决爆音。

1. **关闭虚拟机**（必须彻底关机，不能是挂起状态）。
2. 在宿主机（Windows 11）中，找到你该虚拟机的目录，用记事本打开 `.vmx` 配置文件（例如 `Windows XP.vmx`）。
3. 在文件末尾添加以下两行内容：
```text
sound.bufferTime = "500"
sound.latencyFactor = "2"

```


4. 保存并关闭文件，重新启动虚拟机测试。

---

### 方法二：一键使用 PowerShell 修改 `.vmx`（单行命令）

如果你不想手动翻文件，可以直接在**宿主机**以管理员身份打开 PowerShell，执行以下单行命令（执行前请先**关闭虚拟机**，并**把命令中的 `D:\VMs\XP\XP.vmx` 替换为你实际的 vmx 文件路径**）：

```powershell
$path="D:\VMs\XP\XP.vmx"; if (Test-Path $path) { (Get-Content $path) + "sound.bufferTime = `"500`"" + "sound.latencyFactor = `"2`"" | Set-Content $path; Write-Host "配置添加成功！" -ForegroundColor Green } else { Write-Warning "未找到文件，请检查路径！" }

```

---

### 方法三：修改虚拟机声音设备类型

新版 VMware 默认可能会给虚拟机分配 `hdaudio`（高清音频），但 XP 对其支持不佳，将其改回传统的 `sb16` 或 `es1371` 通常更稳定。

1. 同样先**关闭虚拟机**。
2. 用记事本打开 `.vmx` 文件，找到 `sound.virtualDev` 这一行。
3. 将其修改为：
```text
sound.virtualDev = "es1371"

```


*(注：如果找不到这一行，直接在文件末尾添加 `sound.virtualDev = "es1371"` 即可)*
4. 保存并重启虚拟机。

---

### 方法四：降低虚拟机内的音频加速（XP 系统内设置）

如果通过上述修改仍有轻微杂音，可以在 XP 内部降低硬件加速：

1. 在 XP 虚拟机内，点击 **开始** $\rightarrow$ **运行**，输入 `dxdiag` 回车。
2. 切换到 **声音 (Sound)** 选项卡。
3. 找到 **声音硬件加速级别 (Hardware Sound Acceleration Level)**，将其从“完全加速”向左拖动一格，改为 **“标准加速”** 或 **“基本加速”**。
4. 点击退出，重启虚拟机。

你可以先尝试**方法一**或**方法二**，这通常能解决 90% 以上的 VMware XP 爆音问题。