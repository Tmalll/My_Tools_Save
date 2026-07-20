const CONFIG = {
    // ==================== 🔒 安全多前缀分流沙盒 ====================
    AUTH_PREFIX: '/SP3eHm618kN71DD',       // 🛠 *管理面板专用前缀*（严格保密，仅用于登录主页）
    AUTH_PREFIX_SHARE: '/share-img-7788',  // 🔗 *外链分发专用前缀*（公开给论坛、MJJ 只能看到这个）

    DEBUG_MODE: 1,                         // 🛠 1-开启响应头日志反馈并禁用缓存 | 0-关闭调试启用边缘强缓存
    CACHE_TTL: 2592000,                    // 边缘强缓存时间（30天）

    // ==================== ⚡ 熔断预限流标尺 ====================
    MAX_ALLOWED_BASE64_SIZE_KB: 5120,      // 允许的源站最大 Base64 文本大小 (5MB)
    ALLOW_UNKNOWN_LENGTH: 1,               // 1: 遇 Gist 缺 Content-Length 允许继续读取 | 0: 拒绝

    // ==================== 🛠 路由注册表 & 模式集 ====================
    // MODE 约束说明: 0=允许所有文件 | 1=严格只允许图片 | 2=只允许二进制文件 | 3=大文件占位
    ROUTE_REGISTRY: {
        'normal':       { set_path: '',            is_b64: 0, set_mime: 'AUTO_MAP',   mode: 0 },
        'bigmode':      { set_path: 'bigmode',      is_b64: 0, set_mime: 'AUTO_MAP',   mode: 3 }, 
        'jpg64':        { set_path: 'jpg64',        is_b64: 1, set_mime: 'image/jpeg',  mode: 1 },
        'png64':        { set_path: 'png64',        is_b64: 1, set_mime: 'image/png',   mode: 1 },
        'gif64':        { set_path: 'gif64',        is_b64: 1, set_mime: 'image/gif',   mode: 1 },
        'webp64':       { set_path: 'webp64',       is_b64: 1, set_mime: 'image/webp',  mode: 1 }
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
        const pShare = CONFIG.AUTH_PREFIX_SHARE.replace(/^\/+|\/+$/g, '');
        let path = url.pathname;

        // 1. 严格的安全分流多路由关卡
        if (path === '/' + pAdmin || path === '/' + pAdmin + '/') {
            // 精准命中私有管理前缀，返回居中优化版生成面板
            return new Response(getHelpHTML(url.origin), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        } else if (path.startsWith('/' + pAdmin + '/')) {
            path = path.substring(pAdmin.length + 1);
        } else if (path.startsWith('/' + pShare + '/')) {
            path = path.substring(pShare.length + 1);
        } else {
            // 访问非授权路径（包括试图篡改或摸索前缀的 MJJ）直接假死返回 403
            return new Response("Forbidden: Invalid Endpoint", { status: 403 });
        }

        // 2. 剥离并提取用于欺骗论坛和另存为时对齐的“真实文件名尾巴”
        const fakeTailMatch = path.match(/\/([^\/]+\.[a-zA-Z0-9]+)$/i);
        let discoveredFileName = "file.jpg"; 
        if (fakeTailMatch) {
            discoveredFileName = fakeTailMatch[1];
            path = path.replace(/\/([^\/]+\.[a-zA-Z0-9]+)$/i, ''); // 斩断尾巴，恢复真实请求路由
        }

        // 3. 动态解析内部子路由模式 (normal / jpg64 / bigmode)
        let modeKey = 'normal';
        const pathSegments = path.split('/').filter(p => p !== '');
        const firstPart = pathSegments[0];

        if (firstPart && CONFIG.ROUTE_REGISTRY[firstPart]) {
            modeKey = firstPart;
            path = '/' + pathSegments.slice(1).join('/');
        } else {
            path = '/' + pathSegments.join('/');
        }

        const currentMode = CONFIG.ROUTE_REGISTRY[modeKey];

        // 拦截空链接
        if (path === '/' || path === '') {
            return new Response("Forbidden: Missing Target Resource URL", { status: 400 });
        }

        // 4. 解析拼装出真实的上游源站目标网链
        let targetPath = path.slice(1) + url.search + url.hash;
        let target = parseTargetUrl(targetPath);
        if (!target) return new Response("Invalid Proxy Target Format", { status: 400 });

        // 5. 文件后缀提取与双扩展名安全前置审计
        const originalPathname = target.pathname.toLowerCase();
        const isUrlB64Ext = originalPathname.endsWith('.b64');
        const simFilename = isUrlB64Ext ? originalPathname.slice(0, -4) : originalPathname;
        const extMatch = simFilename.match(/\.([a-zA-Z0-9]+)$/);
        const extension = extMatch ? extMatch[1] : "";

        // 普通路由下如果是双后缀，但倒数第二个后缀不是合法图片，直接拒绝解析
        if (modeKey === 'normal' && isUrlB64Ext && !MIME_MAP.hasOwnProperty(extension)) {
            return new Response(`Forbidden: Unsupported double extension pattern [.${extension}.b64]`, { status: 400 });
        }

        // 匹配或强行分发最终 MIME
        let finalMime = (currentMode.set_mime === 'AUTO_MAP') ? (MIME_MAP[extension] || "application/octet-stream") : currentMode.set_mime;

        // MODE 策略鉴权：1 代表强制仅限图片相关业务流
        if (currentMode.mode === 1) {
            const isImg = Object.values(MIME_MAP).includes(finalMime) || MIME_MAP.hasOwnProperty(extension);
            if (!isImg) return new Response("Forbidden: Target resource is non-image in strict mode.", { status: 403 });
        }

        // 6. 边缘高速缓存读取拦截
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) return cachedResponse;
        }

        // 7. 发起 fetch 并执行提早熔断控制
        const fetchHeaders = new Headers();
        fetchHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
        
        let upstream = await fetch(target, { method: 'GET', headers: fetchHeaders, redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: Status ${upstream.status}`, { status: upstream.status });

        if (!checkContentLength(upstream, CONFIG.MAX_ALLOWED_BASE64_SIZE_KB * 1024, CONFIG.ALLOW_UNKNOWN_LENGTH)) {
            return new Response("Forbidden: Content size out of limit bounds.", { status: 413 });
        }

        // 8. 核心解码业务分流
        let finalBody;
        const needDecode = (currentMode.is_b64 === 1) || (modeKey === 'normal' && isUrlB64Ext);

        if (needDecode) {
            try {
                if (CONFIG.DEBUG_MODE === 1) debugHeaders.set("X-Debug-Stage", "1-FetchSuccess");
                let base64Text = await upstream.text();
                
                // 执行流清洗与对齐补齐
                base64Text = cleanAndPadBase64(base64Text, CONFIG.MAX_ALLOWED_BASE64_SIZE_KB * 1024);
                if (CONFIG.DEBUG_MODE === 1) debugHeaders.set("X-Debug-Clean-Len", base64Text.length.toString());

                // 定长高性能内存区域映射解码
                const binaryString = atob(base64Text);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                // 快速魔数判定
                if (len >= 2 && CONFIG.DEBUG_MODE === 1) {
                    debugHeaders.set("X-Debug-Image-Magic", `${bytes[0].toString(16).toUpperCase()}${bytes[1].toString(16).toUpperCase()}`);
                    debugHeaders.set("X-Debug-Stage", "3-RenderSuccess");
                }

                finalBody = bytes.buffer;
            } catch (e) {
                const errHeaders = new Headers();
                errHeaders.set("Access-Control-Allow-Origin", "*");
                if (CONFIG.DEBUG_MODE === 1) errHeaders.set("X-Debug-Error", e.message);
                return new Response(`[Decoder Error] Base64 failure: ${e.message}`, { status: 500, headers: errHeaders });
            }
        } else {
            finalBody = await upstream.arrayBuffer();
        }

        // 9. 构建最终吐给浏览器的安全响应包
        const respHeaders = new Headers();
        respHeaders.set("Access-Control-Allow-Origin", "*");
        respHeaders.set("Content-Type", finalMime);
        // 让图片右键另存为、或者二进制触发下载时的文件名与截取的原始大名完美保持一致
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

// ==================== 🧩 解耦底层独立业务子模块 ====================

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

function cleanAndPadBase64(text, maxBytes) {
    let cleaned = text.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
    const mod = cleaned.length % 4;
    if (mod === 1) throw new Error("Invalid Base64 structure (mod 1)");
    if (mod > 1) cleaned += "=".repeat(4 - mod);
    if (cleaned.length > maxBytes) throw new Error("Cleaned stream exceeds memory limit size.");
    return cleaned;
}

// ==================== 🖥️ 优雅全居中矩阵式主页控制面板 ====================
function getHelpHTML(origin) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CDN 多模态矩阵生成器</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#222;background-image:linear-gradient(135deg,#f5f7fa 0%,#e4e8f0 100%);min-height:95vh;margin:0;padding:20px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start}.container{width:100%;max-width:850px;display:flex;flex-direction:column;gap:20px}.card{background:#fff;border-radius:12px;padding:24px;box-shadow:0 8px 24px rgba(0,0,0,0.05)}form{display:flex;gap:10px}input[type="text"]{flex:1;padding:12px;font-size:14px;border:1px solid #dcdfe6;border-radius:6px;outline:none;transition:all .3s}input[type="text"]:focus{border-color:#409eff;box-shadow:0 0 6px rgba(64,158,255,.2)}.btn{padding:12px 20px;color:#fff;border:none;cursor:pointer;font-size:14px;background:#409eff;border-radius:6px;font-weight:500;transition:background .2s}.btn:hover{background:#66b1ff}.btn-group{display:flex;gap:8px;margin-top:10px}.btn-action{padding:6px 12px;font-size:12px;background:#f0f2f5;color:#606266;border:1px solid #dcdfe6;border-radius:4px;cursor:pointer;transition:all .2s;font-weight:500}.btn-action:hover{background:#ecf5ff;color:#409eff;border-color:#c6e2ff}.block-title{font-size:14px;font-weight:600;color:#303133;margin-bottom:8px;display:flex;align-items:center;gap:6px}.block-item{background:#f8f9fa;border-left:4px solid #409eff;padding:14px;border-radius:0 6px 6px 0;margin-bottom:15px}.block-item.big{border-left-color:#e6a23c}.block-item.force{border-left-color:#67c23a}p.uri-p{margin:4px 0;font-size:13px;word-break:break-all;font-family:monospace;background:#ebedf0;padding:8px;border-radius:4px}p.uri-p a{color:#409eff;text-decoration:none}p.uri-p a:hover{text-decoration:underline}code{background:#fff4f4;padding:2px 4px;color:#c7254e;border-radius:3px;font-size:12px}</style></head><body>
    <div class="container">
        <div class="card">
            <h3 style="margin-top:0;color:#1f2f3d;text-align:center;">🛰️ CDN 智能矩阵多模态外链分发系统</h3>
            <form onsubmit="generateMatrix(); return false;"><input type="text" id="urlInput" placeholder="请输入源站 Gist Raw 原始物理连接..." required><button type="submit" class="btn">生成矩阵直链</button></form>
        </div>
        <div id="matrixContainer" style="display:none;">
            <div class="card">
                <div class="block-item"><div class="block-title">🌐 ① 智能通用自适应档 (Normal Mode) <span>[MODE: 0]</span></div><p class="uri-p"><a id="url_normal" href="#" target="_blank"></a></p><div class="btn-group"><button class="btn-action" onclick="copyUri('url_normal')">📋 复制直链</button><button class="btn-action" onclick="handleJump('url_normal',event)">🚀 触发跳转</button></div></div>
                <div class="block-item big"><div class="block-title">📦 ② 大文件沙盒容灾档 (BigMode - 占位预留) <span>[MODE: 3]</span></div><p class="uri-p"><a id="url_bigmode" href="#" target="_blank"></a></p><div class="btn-group"><button class="btn-action" onclick="copyUri('url_bigmode')">📋 复制直链</button><button class="btn-action" onclick="handleJump('url_bigmode',event)">🚀 触发跳转</button></div></div>
                <div class="block-item force"><div class="block-title">🖼️ ③ 强制图片强制解码档 (Force JPG64 Channel) <span>[MODE: 1]</span></div><p class="uri-p"><a id="url_jpg64" href="#" target="_blank"></a></p><div class="btn-group"><button class="btn-action" onclick="copyUri('url_jpg64')">📋 复制直链</button><button class="btn-action" onclick="handleJump('url_jpg64',event)">🚀 触发跳转</button></div></div>
            </div>
        </div>
        <div class="card">
            <h4 style="margin-top:0;color:#303133;">💡 多模态配置说明与高级参数参考</h4>
            <p style="font-size:13px;color:#606266;line-height:1.6;margin-bottom:0;">
                • <b>动态强制图片模式：</b> 当需要跨平台或面对强校验源站时，可以使用 <code>jpg64 / png64 / gif64 / webp64</code> 子路由强制告知 Worker 流类型。<br>
                • <b>高隐蔽防测绘分离：</b> 生成外链前缀为 <code>${CONFIG.AUTH_PREFIX_SHARE}</code>，此路径无法反探主面板，截断链接尝试访问根路径将直接返回无害假死页面。<br>
                • <b>高级跳转支持：</b> 点击“触发跳转”默认新标签页打开，同时完美监听修饰键：按住 <code>Ctrl</code> 键（新标签页打开）、按住 <code>Shift</code> 键（当前标签页原地替换），极大方便您的调试环境。
            </p>
        </div>
    </div>
    <script>
        function generateMatrix() {
            let u = document.getElementById('urlInput').value.trim(); if(!u) return;
            if(/^https?:\\/\\//i.test(u)){ u = u.replace(/^https?:\\/\\//i, function(m){ return m.toLowerCase().replace('://', '/'); }); } else if(!/^https?\\//i.test(u)){ u = 'https/' + u; }
            
            let rawFileName = "file.jpg";
            const parts = u.split('/');
            const lastPart = parts[parts.length - 1];
            if(lastPart && lastPart.includes('.')) {
                rawFileName = lastPart.toLowerCase().endsWith('.b64') ? lastPart.slice(0, -4) : lastPart;
            }

            const sharePrefix = "${origin}${CONFIG.AUTH_PREFIX_SHARE}";
            
            const lnkNormal = sharePrefix + '/' + u + '/' + rawFileName;
            const lnkBigmode = sharePrefix + '/bigmode/' + u + '/' + rawFileName;
            const lnkJpg64 = sharePrefix + '/jpg64/' + u + '/' + rawFileName;

            // 联动填充 a 标签的 text 与 href
            setupLinkElement('url_normal', lnkNormal);
            setupLinkElement('url_bigmode', lnkBigmode);
            setupLinkElement('url_jpg64', lnkJpg64);
            
            document.getElementById('matrixContainer').style.display = 'block';
        }
        function setupLinkElement(id, val) {
            const el = document.getElementById(id);
            el.textContent = val;
            el.href = val;
        }
        function copyUri(id) {
            // 精准抓取对应 a 标签中的反代链接进行复制
            const text = document.getElementById(id).textContent;
            navigator.clipboard.writeText(text).then(() => { alert("🚀 对应模态的反代直链已成功复制到剪贴板！"); });
        }
        function handleJump(id, event) {
            const url = document.getElementById(id).textContent; if(!url) return;
            if (event.shiftKey) { 
                window.location.href = url; 
            } else { 
                window.open(url, '_blank'); 
            }
        }
    </script>
</body></html>`;
}