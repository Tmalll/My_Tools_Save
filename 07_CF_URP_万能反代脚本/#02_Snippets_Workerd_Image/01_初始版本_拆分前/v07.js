// =================================================================
// ⚙️ 模块一：全局核心独立参数控制表 (大小限额完全独立，互不关联)
// =================================================================
const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD',       // 管理面板与直链共用的唯一安全路径前缀
    DEBUG_MODE: 1,                         // 1-开启调试模式(禁用边缘缓存，返回日志头) | 0-生产强缓存模式
    CACHE_TTL: 2592000,                    // 生产环境下，Cloudflare 边缘缓存周期 (30天)

    IMAGE_ENCODE_LIMIT_KB: 5120,           // 限制前端 HTML 本地图片转 Base64 的最大体积 (5MB)
    MAX_ALLOWED_BASE64_SIZE_KB: 8192,      // 后端 Worker 允许拉取并解码的 Base64 文本最大限制 (8MB)
    ALLOW_UNKNOWN_LENGTH: 1,               // 源站缺少 Content-Length 标头时：1-允许继续读取 | 0-直接拒绝
    DEFAULT_FAKE_NAME: 'image',            // 针对 Pastebin 等无后缀源站，自动补全的默认主文件名

    // =================================================================
    // 🛠️ 统一多模态路由策略注册表 (前端卡片动态生成、后端解码均完全绑定此表)
    // =================================================================
    ROUTE_REGISTRY: {
        'jpg64':  { label: '强制 JPEG 格式解码流', set_path: 'jpg64',  is_b64: 1, set_mime: 'image/jpeg' },
        'png64':  { label: '强制 PNG 格式解码流',  set_path: 'png64',  is_b64: 1, set_mime: 'image/png' },
        'gif64':  { label: '强制 GIF 格式解码流',  set_path: 'gif64',  is_b64: 1, set_mime: 'image/gif' },
        'webp64': { label: '强制 WEBP 格式解码流', set_path: 'webp64', is_b64: 1, set_mime: 'image/webp' }
    }
};

export default {
    // =================================================================
    // 🚀 模块二：Cloudflare Worker 主入口反代与解码调度
    // =================================================================
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const cleanPath = url.pathname.toLowerCase();
        const debugHeaders = new Headers();
        
        if (cleanPath === '/favicon.ico' || cleanPath === '/apple-touch-icon.png') {
            return new Response(null, { status: 204 });
        }
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" }
            });
        }

        const pAdmin = CONFIG.AUTH_PREFIX.replace(/^\/+|\/+$/g, '');
        let path = url.pathname;

        // 私有安全前缀鉴权拦截
        if (path === '/' + pAdmin || path === '/' + pAdmin + '/') {
            return new Response(getPanelHTML(url.origin), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        } else if (path.startsWith('/' + pAdmin + '/')) {
            path = path.substring(pAdmin.length + 1);
        } else {
            return new Response("Forbidden: Access Denied", { status: 403 });
        }

        // 剥离并恢复尾部伪装的文件名
        const fakeTailMatch = path.match(/\/([^\/]+\.[a-zA-Z0-9]+)$/i);
        let discoveredFileName = ""; 
        if (fakeTailMatch) {
            discoveredFileName = fakeTailMatch[1];
            path = path.replace(/\/([^\/]+\.[a-zA-Z0-9]+)$/i, ''); 
        }

        // 匹配当前请求所指向的注册表动作前缀
        let modeKey = '';
        const pathSegments = path.split('/').filter(p => p !== '');
        const firstPart = pathSegments[0];

        if (firstPart && CONFIG.ROUTE_REGISTRY[firstPart]) {
            modeKey = firstPart;
            path = '/' + pathSegments.slice(1).join('/');
        } else {
            modeKey = 'jpg64'; 
            path = '/' + pathSegments.join('/');
        }

        const currentMode = CONFIG.ROUTE_REGISTRY[modeKey];
        if (path === '/' || path === '') return new Response("Forbidden: Target Missing", { status: 400 });

        // 还原真实的远程源站物理链接
        let targetPath = path.slice(1) + url.search + url.hash;
        let target = parseTargetUrl(targetPath);
        if (!target) return new Response("Invalid Proxy Target Format", { status: 400 });

        // 高速边缘缓存读取
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) return cachedResponse;
        }

        // 发起远程抓取
        const fetchHeaders = new Headers();
        fetchHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
        let upstream = await fetch(target, { method: 'GET', headers: fetchHeaders, redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: ${upstream.status}`, { status: upstream.status });

        // 大小安全熔断限流阀门
        if (!checkContentLength(upstream, CONFIG.MAX_ALLOWED_BASE64_SIZE_KB * 1024, CONFIG.ALLOW_UNKNOWN_LENGTH)) {
            return new Response("Forbidden: Content size out of limit bounds.", { status: 413 });
        }

        // 核心 Base64 内存映射转换流
        let finalBody;
        if (currentMode.is_b64 === 1) {
            try {
                if (CONFIG.DEBUG_MODE === 1) debugHeaders.set("X-Debug-Stage", "1-FetchSuccess");
                const base64Text = await upstream.text();
                finalBody = decodeBase64Stream(base64Text, CONFIG.MAX_ALLOWED_BASE64_SIZE_KB * 1024, debugHeaders);
            } catch (e) {
                return new Response(`[Decoder Error] ${e.message}`, { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
            }
        } else {
            finalBody = await upstream.arrayBuffer();
        }

        // 装配传出标准的浏览器响应包
        const respHeaders = new Headers();
        respHeaders.set("Access-Control-Allow-Origin", "*");
        respHeaders.set("Content-Type", currentMode.set_mime);
        respHeaders.set("Content-Disposition", `inline; filename="${encodeURIComponent(discoveredFileName || (CONFIG.DEFAULT_FAKE_NAME + '.' + modeKey.replace('64','')))}"`);

        if (CONFIG.DEBUG_MODE === 1) {
            respHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate");
            for (let [key, value] of debugHeaders.entries()) { respHeaders.set(key, value); }
        } else {
            respHeaders.set("Cache-Control", `public, max-age=${CONFIG.CACHE_TTL}`);
        }

        const finalResponse = new Response(finalBody, { status: 200, headers: respHeaders });
        if (CONFIG.DEBUG_MODE !== 1) ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));

        return finalResponse;
    }
};

// =================================================================
// 🧩 模块三：解耦的高效底层子工具函数
// =================================================================

function parseTargetUrl(targetPath) {
    if (!/^https?[:\/]+/i.test(targetPath)) return null;
    let fullTarget = targetPath.replace(/^https?[:\/]+/i, 'https://');
    if (targetPath.startsWith('http/')) fullTarget = targetPath.replace(/^http[:\/]+/i, 'http://');
    try { return new URL(fullTarget); } catch { return null; }
}

function checkContentLength(response, maxBytes, allowUnknown) {
    const lenStr = response.headers.get("content-length");
    if (!lenStr) return allowUnknown === 1;
    return parseInt(lenStr, 10) <= maxBytes;
}

function decodeBase64Stream(rawText, maxBytes, debugHeaders) {
    let cleaned = rawText.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
    const mod = cleaned.length % 4;
    if (mod === 1) throw new Error("Invalid Base64 structure (mod 1)");
    if (mod > 1) cleaned += "=".repeat(4 - mod);
    if (cleaned.length > maxBytes) throw new Error("Cleaned stream exceeds size limitation.");

    const binaryString = atob(cleaned);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// =================================================================
// 🖥️ 模块四：主页 HTML 干净重构版 (纯字符串智能配对，100% 稳定防失效)
// =================================================================
function getPanelHTML(origin) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CDN 多模态外链面板</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#222;background:#f4f6f9;margin:0;padding:20px;display:flex;flex-direction:column;align-items:center}.container{width:100%;max-width:860px;display:flex;flex-direction:column;gap:15px}.card{background:#fff;border-radius:10px;padding:20px;box-shadow:0 4px 16px rgba(0,0,0,0.06)}.toolbar{display:flex;gap:10px;align-items:center}input[type="text"]{flex:1;padding:11px;font-size:14px;border:1px solid #dcdfe6;border-radius:6px;outline:none}input[type="text"]:focus{border-color:#409eff}.btn{padding:11px 16px;color:#fff;border:none;cursor:pointer;font-size:14px;background:#409eff;border-radius:6px;font-weight:500;white-space:nowrap}.btn:hover{background:#66b1ff}.btn-enc{background:#67c23a}.btn-enc:hover{background:#85ce61}.block-item{background:#f8f9fa;border-left:4px solid #409eff;padding:15px;border-radius:4px;margin-top:5px}.block-title{font-size:14px;font-weight:600;color:#303133;margin-bottom:8px}p.uri-p{margin:6px 0;font-size:13px;word-break:break-all;white-space:pre-wrap;font-family:monospace;background:#f0f2f5;padding:10px;border-radius:4px;line-height:1.4}p.uri-p a{color:#409eff;text-decoration:none}p.uri-p a:hover{text-decoration:underline}.btn-group{display:flex;gap:8px;margin-top:10px}.btn-act{padding:5px 12px;font-size:12px;background:#fff;color:#606266;border:1px solid #dcdfe6;border-radius:4px;cursor:pointer;font-weight:500}.btn-act:hover{background:#ecf5ff;color:#409eff;border-color:#c6e2ff}#progressWrapper{width:100%;background:#ebeef5;border-radius:8px;height:14px;margin-top:10px;display:none;overflow:hidden}#progressBar{width:0%;background:#67c23a;height:100%;color:#fff;font-size:10px;text-align:center;line-height:14px;font-weight:bold;transition:width 0.1s linear}</style></head><body>
    <div class="container">
        <div class="card">
            <h3 style="margin-top:0;color:#1f2f3d;text-align:center;margin-bottom:15px;">🛰️ CDN 智能智能适配外链系统</h3>
            <div class="toolbar">
                <input type="text" id="urlInput" placeholder="请输入源站链接 (例如 Gist Raw 或 Pastebin 连接)...">
                <button class="btn" id="btnGenerate">生成反代链接</button>
                <button class="btn btn-enc" id="btnPickerTrigger">编码为 Base64</button>
            </div>
            <input type="file" id="localFilePicker" accept="image/*" style="display:none;">
            <div id="progressWrapper"><div id="progressBar">0%</div></div>
        </div>

        <div id="matrixContainer" style="display:none;" class="card">
            <div id="renderGridBox"></div>
        </div>

        <div class="card" style="font-size:13px;color:#606266;line-height:1.6;">
            💡 <b>自适应说明：</b>输入源站链接并点击生成后，系统会自动根据 URL 内部所携带的文件名后缀进行智能配对，<b>在下方仅展现最精确的一款适配格式卡片</b>。如果是无任何后缀的外部网链（如 Pastebin 纯流），系统将默认启用 <code>jpg64</code> 通道并追加默认名（如 <code>${CONFIG.DEFAULT_FAKE_NAME}.jpg</code>），完全避免冗余展示并确保链接可点击、复制。
        </div>
    </div>
    <script>
        // 映射后端全局核心参数策略至前端
        const ROUTE_REGISTRY = ${JSON.stringify(CONFIG.ROUTE_REGISTRY)};
        const DEFAULT_FAKE_NAME = "${CONFIG.DEFAULT_FAKE_NAME}";
        const ENCODE_LIMIT_KB = ${CONFIG.IMAGE_ENCODE_LIMIT_KB};

        // 【功能一】生成按钮：100% 纯字符串逻辑匹配，无任何高风险Fetch请求
        document.getElementById('btnGenerate').addEventListener('click', function() {
            let u = document.getElementById('urlInput').value.trim();
            if(!u) { alert("请输入有效的源站网址！"); return; }

            const gridBox = document.getElementById('renderGridBox');
            let detectedMode = "jpg64"; // 无后缀时的安全回退基准
            let rawFileName = "";

            // 提取链接主路径去除查询参
            const pureUrlPath = u.split('?')[0];
            const parts = pureUrlPath.split('/');
            const lastPart = parts[parts.length - 1];

            // 智能判定后缀格式来锁定展现卡片
            if(lastPart && lastPart.includes('.')) {
                // 去除特殊的 .b64 标志干扰
                rawFileName = lastPart.toLowerCase().endsWith('.b64') ? lastPart.slice(0, -4) : lastPart;
                const ext = rawFileName.split('.').pop().toLowerCase();
                
                // 根据实际物理扩展名收敛展示目标
                if(ext === 'png') detectedMode = "png64";
                else if(ext === 'gif') detectedMode = "gif64";
                else if(ext === 'webp') detectedMode = "webp64";
                else detectedMode = "jpg64";
            }

            // 防空机制：针对 Pastebin 等无后缀链接，智能补足伪装尾巴名
            if(!rawFileName) {
                const pureExt = detectedMode.replace('64', '');
                rawFileName = DEFAULT_FAKE_NAME + "." + pureExt;
            }

            // 标准化反代内部格式规范
            if(/^https?:\\/\\//i.test(u)){ u = u.replace(/^https?:\\/\\//i, function(m){ return m.toLowerCase().replace('://', '/'); }); } else if(!/^https?\\//i.test(u)){ u = 'https/' + u; }

            const prefixHost = window.location.origin + "${CONFIG.AUTH_PREFIX}";
            const strategy = ROUTE_REGISTRY[detectedMode];
            const finalLink = prefixHost + '/' + strategy.set_path + '/' + u + '/' + rawFileName;

            // 纯安全注入卡片内容
            gridBox.innerHTML = \`
                <div class="block-item">
                    <div class="block-title">🎯 自适应配对匹配成功：\${strategy.label} (\${detectedMode})</div>
                    <p class="uri-p"><a href="\${finalLink}" target="_blank">\${finalLink}</a></p>
                    <div class="btn-group">
                        <button class="btn-act" id="innerBtnCopy">📋 复制链接</button>
                        <button class="btn-act" id="innerBtnJump">🚀 跳转链接</button>
                    </div>
                </div>
            \`;

            document.getElementById('matrixContainer').style.display = 'block';

            // 动态绑定复制直链事件
            document.getElementById('innerBtnCopy').addEventListener('click', function() {
                navigator.clipboard.writeText(finalLink).then(() => {
                    alert("🚀 反代直链已完美复制到剪贴板！");
                }).catch(() => { alert("复制失败，请手动右键链接复制。"); });
            });

            // 动态绑定感知跳转事件
            document.getElementById('innerBtnJump').addEventListener('click', function(e) {
                if (e.shiftKey) {
                    window.location.href = finalLink;
                } else {
                    window.open(finalLink, '_blank');
                }
            });
        });

        // 【功能二】转码按钮：唤起原生本地文件选择器
        document.getElementById('btnPickerTrigger').addEventListener('click', function() {
            document.getElementById('localFilePicker').click();
        });

        // 【功能三】零点击文件自动处理及打包下载落地
        document.getElementById('localFilePicker').addEventListener('change', function() {
            if(this.files.length === 0) return;

            const file = this.files[0];
            const sizeInKB = file.size / 1024;

            if(sizeInKB > ENCODE_LIMIT_KB) {
                alert("❌ 转码终止：当前本地图片体积为 " + sizeInKB.toFixed(1) + " KB，已超过设置的最大限额 " + ENCODE_LIMIT_KB + " KB！");
                this.value = ""; 
                return;
            }

            const wrapper = document.getElementById('progressWrapper');
            const bar = document.getElementById('progressBar');
            wrapper.style.display = 'block';
            bar.style.width = '0%';
            bar.textContent = '0%';

            const reader = new FileReader();
            
            reader.onprogress = function(e) {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    bar.style.width = percent + '%';
                    bar.textContent = percent + '%';
                }
            };

            reader.onload = function(e) {
                bar.style.width = '100%';
                bar.textContent = '100% (系统打包下载中...)';
                
                setTimeout(() => {
                    let base64Result = e.target.result;
                    if(base64Result.includes("base64,")) {
                        base64Result = base64Result.split("base64,")[1];
                    }

                    const blob = new Blob([base64Result], { type: "text/plain;charset=utf-8" });
                    const downloadUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = file.name + ".b64";
                    document.body.appendChild(a);
                    a.click();

                    document.body.removeChild(a);
                    URL.revokeObjectURL(downloadUrl);
                    document.getElementById('localFilePicker').value = ""; 
                    wrapper.style.display = 'none';
                }, 200);
            };
            
            reader.readAsDataURL(file);
        });
    </script>
</body></html>`;
}