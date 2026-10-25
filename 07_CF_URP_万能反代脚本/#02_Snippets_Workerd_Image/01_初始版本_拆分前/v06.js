const CONFIG = {
    // ==================== 🔒 安全多前缀分流沙盒 ====================
    AUTH_PREFIX: '/SP3eHm618kN71DD',       // 🛠️ 全局唯一安全前缀（管理面板与反代直链共用）
    DEBUG_MODE: 1,                         // 🛠️ 1-开启响应头日志调试且禁用缓存 | 0-关闭调试启用缓存
    CACHE_TTL: 2592000,                    // 强缓存时间 (30天)

    // ==================== ⚡ 熔断预限流标尺 ====================
    IMAGE_ENCODE_LIMIT_KB: 5120,           // 🏷️ 前端图片文件编码限制大小 (5MB)
    MAX_ALLOWED_BASE64_SIZE_KB: Math.floor(5120 * 1.35), // 后端 Base64 文本限制自动计算乘以 1.35 膨胀率
    ALLOW_UNKNOWN_LENGTH: 1,               // 1: 缺 Content-Length 允许继续读取 | 0: 拒绝

    // ==================== 🛠️ 路由注册表 & 模式集 ====================
    // mode 约束说明: 0=自适应通通允许 | 1=严格只允许图片解码流
    ROUTE_REGISTRY: {
        'jpg64':        { label: 'JPEG 格式解码流 (jpg64)',   is_b64: 1, set_mime: 'image/jpeg',  mode: 1 },
        'png64':        { label: 'PNG 格式解码流 (png64)',    is_b64: 1, set_mime: 'image/png',   mode: 1 },
        'gif64':        { label: 'GIF 格式解码流 (gif64)',    is_b64: 1, set_mime: 'image/gif',   mode: 1 },
        'webp64':       { label: 'WEBP 格式解码流 (webp64)',  is_b64: 1, set_mime: 'image/webp',  mode: 1 }
    }
};

const MIME_MAP = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 
    'gif': 'image/gif', 'webp': 'image/webp', 'bmp': 'image/bmp', 
    'ico': 'image/x-icon', 'svg': 'image/svg+xml'
};

export default {
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

        // 1. 安全多路径路由关卡拦截
        if (path === '/' + pAdmin || path === '/' + pAdmin + '/') {
            return new Response(getPanelHTML(url.origin), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        } else if (path.startsWith('/' + pAdmin + '/')) {
            path = path.substring(pAdmin.length + 1);
        } else {
            return new Response("Forbidden: Invalid Access Endpoint", { status: 403 });
        }

        // 2. 剥离并截取用于分发下载落地的“真实原文件名尾巴”
        const fakeTailMatch = path.match(/\/([^\/]+\.[a-zA-Z0-9]+)$/i);
        let discoveredFileName = "file.jpg"; 
        if (fakeTailMatch) {
            discoveredFileName = fakeTailMatch[1];
            path = path.replace(/\/([^\/]+\.[a-zA-Z0-9]+)$/i, ''); // 斩断伪装尾巴，还原真实请求
        }

        // 3. 解析内部子路由模式 (jpg64, png64, gif64, webp64)
        let modeKey = '';
        const pathSegments = path.split('/').filter(p => p !== '');
        const firstPart = pathSegments[0];

        if (firstPart && CONFIG.ROUTE_REGISTRY[firstPart]) {
            modeKey = firstPart;
            path = '/' + pathSegments.slice(1).join('/');
        } else {
            // 如果没匹配到显式前缀，回退到按正常后缀逻辑处理
            modeKey = 'jpg64'; 
            path = '/' + pathSegments.join('/');
        }

        const currentMode = CONFIG.ROUTE_REGISTRY[modeKey];

        if (path === '/' || path === '') {
            return new Response("Forbidden: Missing Target Link", { status: 400 });
        }

        // 4. 构建并解析上游真实指向 URL
        let targetPath = path.slice(1) + url.search + url.hash;
        let target = parseTargetUrl(targetPath);
        if (!target) return new Response("Invalid Proxy Target Format", { status: 400 });

        // 5. 提取文件后缀，分配 MIME 标头
        const originalPathname = target.pathname.toLowerCase();
        const isUrlB64Ext = originalPathname.endsWith('.b64');
        const simFilename = isUrlB64Ext ? originalPathname.slice(0, -4) : originalPathname;
        const extMatch = simFilename.match(/\.([a-zA-Z0-9]+)$/);
        const extension = extMatch ? extMatch[1] : "";

        let finalMime = currentMode.set_mime;

        // 6. 边缘缓存读取拦截
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) return cachedResponse;
        }

        // 7. 拉取源站并进行大小熔断检查
        const fetchHeaders = new Headers();
        fetchHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
        
        let upstream = await fetch(target, { method: 'GET', headers: fetchHeaders, redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: ${upstream.status}`, { status: upstream.status });

        if (!checkContentLength(upstream, CONFIG.MAX_ALLOWED_BASE64_SIZE_KB * 1024, CONFIG.ALLOW_UNKNOWN_LENGTH)) {
            return new Response("Forbidden: Content size out of limit.", { status: 413 });
        }

        // 8. 核心自治函数：Base64 管道解码
        let finalBody;
        if (currentMode.is_b64 === 1) {
            try {
                if (CONFIG.DEBUG_MODE === 1) debugHeaders.set("X-Debug-Stage", "1-FetchSuccess");
                const base64Text = await upstream.text();
                finalBody = decodeBase64Stream(base64Text, CONFIG.MAX_ALLOWED_BASE64_SIZE_KB * 1024, debugHeaders);
            } catch (e) {
                const errHeaders = new Headers();
                errHeaders.set("Access-Control-Allow-Origin", "*");
                if (CONFIG.DEBUG_MODE === 1) errHeaders.set("X-Debug-Error", e.message);
                return new Response(`[Decoder Error] ${e.message}`, { status: 500, headers: errHeaders });
            }
        } else {
            finalBody = await upstream.arrayBuffer();
        }

        // 9. 装配传出最终响应体
        const respHeaders = new Headers();
        respHeaders.set("Access-Control-Allow-Origin", "*");
        respHeaders.set("Content-Type", finalMime);
        respHeaders.set("Content-Disposition", `inline; filename="${encodeURIComponent(discoveredFileName)}"`);

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

// ==================== 🧩 解耦底层独立工具模块 ====================

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

    if (debugHeaders) debugHeaders.set("X-Debug-Clean-Len", cleaned.length.toString());

    const binaryString = atob(cleaned);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    if (len >= 2 && debugHeaders) {
        debugHeaders.set("X-Debug-Image-Magic", `${bytes[0].toString(16).toUpperCase()}${bytes[1].toString(16).toUpperCase()}`);
        debugHeaders.set("X-Debug-Stage", "3-RenderSuccess");
    }
    return bytes.buffer;
}

// ==================== 🖥️ 优雅全居中控制面板 HTML 矩阵 ====================
function getPanelHTML(origin) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CDN 多模态智能分发矩阵</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#222;background-image:linear-gradient(135deg,#f5f7fa 0%,#e4e8f0 100%);min-height:95vh;margin:0;padding:20px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start}.container{width:100%;max-width:880px;display:flex;flex-direction:column;gap:18px}.card{background:#fff;border-radius:12px;padding:24px;box-shadow:0 8px 24px rgba(0,0,0,0.05)}.toolbar-row{display:flex;gap:10px;align-items:center}input[type="text"]{flex:1;padding:12px;font-size:14px;border:1px solid #dcdfe6;border-radius:6px;outline:none;transition:all .3s}input[type="text"]:focus{border-color:#409eff;box-shadow:0 0 6px rgba(64,158,255,.2)}.btn{padding:12px 18px;color:#fff;border:none;cursor:pointer;font-size:14px;background:#409eff;border-radius:6px;font-weight:500;white-space:nowrap;transition:background .2s}.btn:hover{background:#66b1ff}.btn-encode{background:#67c23a}.btn-encode:hover{background:#85ce61}.btn-group{display:flex;gap:8px;margin-top:10px}.btn-action{padding:6px 14px;font-size:12px;background:#f0f2f5;color:#606266;border:1px solid #dcdfe6;border-radius:4px;cursor:pointer;transition:all .2s;font-weight:500}.btn-action:hover{background:#ecf5ff;color:#409eff;border-color:#c6e2ff}.matrix-grid{display:flex;flex-direction:column;gap:15px}.block-item{background:#f8f9fa;border-left:4px solid #409eff;padding:15px;border-radius:0 6px 6px 0}.block-item.jpg{border-left-color:#409eff}.block-item.png{border-left-color:#67c23a}.block-item.gif{border-left-color:#e6a23c}.block-item.webp{border-left-color:#909399}.block-title{font-size:14px;font-weight:600;color:#303133;margin-bottom:8px}p.uri-p{margin:4px 0;font-size:13px;word-break:break-all;font-family:monospace;background:#ebedf0;padding:10px;border-radius:4px;line-height:1.4}p.uri-p a{color:#409eff;text-decoration:none;word-break:break-all}p.uri-p a:hover{text-decoration:underline}#progressWrapper{width:100%;background:#ebeef5;border-radius:10px;height:16px;margin-top:12px;display:none;overflow:hidden}#progressBar{width:0%;background:#67c23a;height:100%;transition:width 0.1s linear;color:#fff;font-size:11px;text-align:center;line-height:16px;font-weight:bold}</style></head><body>
    <div class="container">
        <div class="card">
            <h3 style="margin-top:0;color:#1f2f3d;text-align:center;margin-bottom:18px;">🛰️ CDN 智能多模态矩阵外链系统</h3>
            <div class="toolbar-row">
                <input type="text" id="urlInput" placeholder="请输入源站 Gist Raw 原始物理连接..." required>
                <button class="btn" onclick="generateMatrixChannels()">生成反代链接</button>
                <button class="btn btn-encode" onclick="triggerFilePicker()">编码为 Base64</button>
            </div>
            <input type="file" id="hiddenFileSlot" accept="image/*" style="display:none;" onchange="autoProcessLocalFile()">
            
            <div id="progressWrapper"><div id="progressBar">0%</div></div>
        </div>

        <div id="matrixContainer" style="display:none;">
            <div class="card">
                <div class="matrix-grid">
                    <div class="block-item jpg"><div class="block-title">🖼️ ① 强制 JPEG 格式解码流 (jpg64)</div><p class="uri-p"><a id="lnk_jpg64" href="#" target="_blank"></a></p><div class="btn-group"><button class="btn-action" onclick="copyUriText('lnk_jpg64')">📋 复制链接</button><button class="btn-action" onclick="executeJump('lnk_jpg64',event)">🚀 跳转链接</button></div></div>
                    <div class="block-item png"><div class="block-title">🖼️ ② 强制 PNG 格式解码流 (png64)</div><p class="uri-p"><a id="lnk_png64" href="#" target="_blank"></a></p><div class="btn-group"><button class="btn-action" onclick="copyUriText('lnk_png64')">📋 复制链接</button><button class="btn-action" onclick="executeJump('lnk_png64',event)">🚀 跳转链接</button></div></div>
                    <div class="block-item gif"><div class="block-title">🖼️ ③ 强制 GIF 格式解码流 (gif64)</div><p class="uri-p"><a id="lnk_gif64" href="#" target="_blank"></a></p><div class="btn-group"><button class="btn-action" onclick="copyUriText('lnk_gif64')">📋 复制链接</button><button class="btn-action" onclick="executeJump('lnk_gif64',event)">🚀 跳转链接</button></div></div>
                    <div class="block-item webp"><div class="block-title">🖼️ ④ 强制 WEBP 格式解码流 (webp64)</div><p class="uri-p"><a id="lnk_webp64" href="#" target="_blank"></a></p><div class="btn-group"><button class="btn-action" onclick="copyUriText('lnk_webp64')">📋 复制链接</button><button class="btn-action" onclick="executeJump('lnk_webp64',event)">🚀 跳转链接</button></div></div>
                </div>
            </div>
        </div>

        <div class="card">
            <h4 style="margin-top:0;color:#303133;">💡 参数指标与调试说明</h4>
            <p style="font-size:13px;color:#606266;line-height:1.6;margin-bottom:0;">
                • <b>自动补完技术：</b> 系统会自动截取源文件后缀名，并在反代链的最末尾动态拼回原始大名，完美骗过论坛正则校验并维持右键正常另存为。<br>
                • <b>多重键位调试扩展：</b> 点击 [跳转链接] 完美匹配修饰键：默认新标签页打开、按住 <code>Shift</code> 键（当前标签页原地替换）、按住 <code>Ctrl</code> 键（静默建立后台标签页）。
            </p>
        </div>
    </div>
    <script>
        // 一键生成四大格式矩阵通道
        function generateMatrixChannels() {
            let u = document.getElementById('urlInput').value.trim(); if(!u) return;
            if(/^https?:\\/\\//i.test(u)){ u = u.replace(/^https?:\\/\\//i, function(m){ return m.toLowerCase().replace('://', '/'); }); } else if(!/^https?\\//i.test(u)){ u = 'https/' + u; }
            
            let rawFileName = "file.jpg";
            const parts = u.split('/');
            const lastPart = parts[parts.length - 1];
            if(lastPart && lastPart.includes('.')) {
                rawFileName = lastPart.toLowerCase().endsWith('.b64') ? lastPart.slice(0, -4) : lastPart;
            }

            const prefixHost = "${origin}${CONFIG.AUTH_PREFIX}";
            
            // 组装并映射各模块对应的物理路径
            mapElementConfig('lnk_jpg64', prefixHost + '/jpg64/' + u + '/' + rawFileName);
            mapElementConfig('lnk_png64', prefixHost + '/png64/' + u + '/' + rawFileName);
            mapElementConfig('lnk_gif64', prefixHost + '/gif64/' + u + '/' + rawFileName);
            mapElementConfig('lnk_webp64', prefixHost + '/webp64/' + u + '/' + rawFileName);

            document.getElementById('matrixContainer').style.display = 'block';
        }

        function mapElementConfig(id, val) {
            const el = document.getElementById(id);
            el.textContent = val;
            el.href = val;
        }

        // 精准修复：抓取对应区块的文本直链执行剪贴板克隆
        function copyUriText(id) {
            const txt = document.getElementById(id).textContent;
            if(!txt) return;
            navigator.clipboard.writeText(txt).then(() => { 
                alert("🚀 对应格式的反代直链已完美复制到剪贴板！"); 
            });
        }

        // 高级修饰符跳转事件响应
        function executeJump(id, event) {
            const targetUrl = document.getElementById(id).textContent; if(!targetUrl) return;
            if (event.shiftKey) { 
                window.location.href = targetUrl; 
            } else { 
                window.open(targetUrl, '_blank'); 
            }
        }

        // 触发隐藏的单选槽
        function triggerFilePicker() {
            document.getElementById('hiddenFileSlot').click();
        }

        // 选中后触发自动处理及动态进度条模块
        function autoProcessLocalFile() {
            const picker = document.getElementById('hiddenFileSlot');
            if(picker.files.length === 0) return;

            const file = picker.files[0];
            const sizeInKB = file.size / 1024;
            const limit = ${CONFIG.IMAGE_ENCODE_LIMIT_KB};

            if(sizeInKB > limit) {
                alert("❌ 转码终止：当前文件体积为 " + sizeInKB.toFixed(1) + " KB，已超过限制最大标尺 " + limit + " KB！");
                picker.value = ""; // 还原清空
                return;
            }

            // 显示并激活进度条
            const wrapper = document.getElementById('progressWrapper');
            const bar = document.getElementById('progressBar');
            wrapper.style.display = 'block';
            bar.style.width = '0%';
            bar.textContent = '0%';

            const reader = new FileReader();
            
            // 进度条动态更新回调
            reader.onprogress = function(e) {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    bar.style.width = percent + '%';
                    bar.textContent = percent + '%';
                }
            };

            reader.onload = function(e) {
                bar.style.width = '100%';
                bar.textContent = '100% (打包中...)';
                
                setTimeout(() => {
                    let base64Result = e.target.result;
                    if(base64Result.includes("base64,")) {
                        base64Result = base64Result.split("base64,")[1];
                    }

                    // 构造物理 Blob 并触发极速本地下载
                    const blob = new Blob([base64Result], { type: "text/plain;charset=utf-8" });
                    const downloadUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = file.name + ".b64";
                    document.body.appendChild(a);
                    a.click();

                    // 清理现场
                    document.body.removeChild(a);
                    URL.revokeObjectURL(downloadUrl);
                    picker.value = ""; 
                    wrapper.style.display = 'none'; // 隐藏进度条
                }, 200);
            };
            
            reader.readAsDataURL(file);
        }
    </script>
</body></html>`;
}