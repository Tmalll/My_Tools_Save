const CONFIG = {
    // ==================== 🔒 安全多前缀沙盒 ====================
    AUTH_PREFIX: '/SP3eHm618kN71DD',       // 🛠️ 管理面板专用前缀（绝对保密，不泄露给外链）
    AUTH_PREFIX_SHARE: '/share-img-7788',  // 🔗 最终分发外链专用前缀（MJJ 只能看到这个）
    
    DEBUG_MODE: 1,                         // 🛠️ 1-开启响应头日志调试且禁用缓存 | 0-关闭调试启用缓存
    CACHE_TTL: 2592000,                    // 强缓存时间

    // ==================== ⚡ 熔断预限流标尺 ====================
    MAX_ALLOWED_BASE64_SIZE_KB: 5120,      // 允许的源站最大 Base64 文本大小 (5MB)
    ALLOW_UNKNOWN_LENGTH: 1,               // 1: 缺 Content-Length 允许继续读取 | 0: 拒绝

    // ==================== 🛠️ 路由注册表 & 模式集 ====================
    // MODE 约束说明: 0=允许所有文件 | 1=严格只允许图片 | 2=只允许二进制文件 | 3=大文件占位
    ROUTE_REGISTRY: {
        'normal':       { set_path: '',            is_b64: 0, set_mime: 'AUTO_MAP',   mode: 0 },
        'bigmode':      { set_path: 'bigmode',      is_b64: 0, set_mime: 'AUTO_MAP',   mode: 3 }, // 大文件占位
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
        let isShareRoute = false;

        // 1. 安全前缀路由判定 & MJJ 探针防御拦截
        if (path === '/' + pAdmin || path === '/' + pAdmin + '/') {
            // 精准命中管理员私有前缀根目录 -> 吐出控制面板
            return new Response(getHelpHTML(url.origin), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        } else if (path.startsWith('/' + pAdmin + '/')) {
            path = path.substring(pAdmin.length + 1);
        } else if (path.startsWith('/' + pShare + '/')) {
            path = path.substring(pShare.length + 1);
            isShareRoute = true;
        } else {
            // 其余一切未授权路径（包括试图顺藤摸瓜探测根路径的 MJJ）一律执行假死响应
            return new Response("Not Found", { status: 404 });
        }

        // 2. 剥离并截取用于伪装的“原始文件名尾巴”
        const fakeTailMatch = path.match(/\/([^\/]+\.[a-zA-Z0-9]+)$/i);
        let discoveredFileName = "file.jpg"; 
        if (fakeTailMatch) {
            discoveredFileName = fakeTailMatch[1];
            path = path.replace(/\/([^\/]+\.[a-zA-Z0-9]+)$/i, ''); // 斩断尾部伪装，还原真实网链路径
        }

        // 3. 解析内部子路由动作（提取 normal / jpg64 / bigmode）
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

        // 如果 MJJ 访问 /share-img-7788/ normal 后面没有跟真实网链，直接熔断假死
        if (path === '/' || path === '') {
            return new Response("Welcome to CDN Service Node.", { status: 200 });
        }

        // 4. 构建上游真实指向 URL
        let targetPath = path.slice(1) + url.search + url.hash;
        let target = parseTargetUrl(targetPath);
        if (!target) return new Response("Invalid Proxy Target Format", { status: 400 });

        // 5. 提取源文件名后缀，前置合规审计
        const originalPathname = target.pathname.toLowerCase();
        const isUrlB64Ext = originalPathname.endsWith('.b64');
        const simFilename = isUrlB64Ext ? originalPathname.slice(0, -4) : originalPathname;
        const extMatch = simFilename.match(/\.([a-zA-Z0-9]+)$/);
        const extension = extMatch ? extMatch[1] : "";

        // 普通模式安全检查：如果是 .b64 结尾但倒数第二个后缀不是图片，拒绝解析防止滥用
        if (modeKey === 'normal' && isUrlB64Ext && !MIME_MAP.hasOwnProperty(extension)) {
            return new Response(`Forbidden: Invalid Double Extension [.${extension}.b64]`, { status: 400 });
        }

        // 分发最终判定 MIME 类型
        let finalMime = (currentMode.set_mime === 'AUTO_MAP') ? (MIME_MAP[extension] || "application/octet-stream") : currentMode.set_mime;

        // MODE 安全限制：1 代表严格只允许图片
        if (currentMode.mode === 1) {
            const isImg = Object.values(MIME_MAP).includes(finalMime) || MIME_MAP.hasOwnProperty(extension);
            if (!isImg) return new Response("Forbidden: Mode strict restriction enforced.", { status: 403 });
        }

        const needDecode = (currentMode.is_b64 === 1) || (modeKey === 'normal' && isUrlB64Ext);

        // 6. 边缘缓存存取拦截
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) return cachedResponse;
        }

        // 7. 拉取源站并进行前置大小熔断
        const fetchHeaders = new Headers();
        fetchHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
        
        let upstream = await fetch(target, { method: 'GET', headers: fetchHeaders, redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: ${upstream.status}`, { status: upstream.status });

        if (!checkContentLength(upstream, CONFIG.MAX_ALLOWED_BASE64_SIZE_KB * 1024, CONFIG.ALLOW_UNKNOWN_LENGTH)) {
            return new Response("Forbidden: Content size out of limit.", { status: 413 });
        }

        // 8. 数据管道流式解码与校验
        let finalBody;
        if (needDecode) {
            try {
                if (CONFIG.DEBUG_MODE === 1) debugHeaders.set("X-Debug-Stage", "1-FetchSuccess");
                let base64Text = await upstream.text();
                
                // 执行严谨清洗与补齐
                base64Text = cleanAndPadBase64(base64Text, CONFIG.MAX_ALLOWED_BASE64_SIZE_KB * 1024);
                if (CONFIG.DEBUG_MODE === 1) debugHeaders.set("X-Debug-Clean-Len", base64Text.length.toString());

                // 高速定长内存映射解码
                const binaryString = atob(base64Text);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                // 极轻量级魔数嗅探日志
                if (len >= 2 && CONFIG.DEBUG_MODE === 1) {
                    debugHeaders.set("X-Debug-Image-Magic", `${bytes[0].toString(16).toUpperCase()}${bytes[1].toString(16).toUpperCase()}`);
                    debugHeaders.set("X-Debug-Stage", "3-RenderSuccess");
                }

                finalBody = bytes.buffer;
            } catch (e) {
                const errHeaders = new Headers();
                errHeaders.set("Access-Control-Allow-Origin", "*");
                if (CONFIG.DEBUG_MODE === 1) errHeaders.set("X-Debug-Error", e.message);
                return new Response(`[Decoder Error] ${e.message}`, { status: 500, headers: errHeaders });
            }
        } else {
            finalBody = await upstream.arrayBuffer();
        }

        // 9. 装配传出响应体
        const respHeaders = new Headers();
        respHeaders.set("Access-Control-Allow-Origin", "*");
        respHeaders.set("Content-Type", finalMime);
        // 让另存为的文件名完美变回伪装捕获的真实原名
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

function cleanAndPadBase64(text, maxBytes) {
    let cleaned = text.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
    const mod = cleaned.length % 4;
    if (mod === 1) throw new Error("Invalid Base64 structure (mod 1)");
    if (mod > 1) cleaned += "=".repeat(4 - mod);
    if (cleaned.length > maxBytes) throw new Error("Cleaned stream exceeds size limitation.");
    return cleaned;
}

// ==================== 🖥️ 高端多模态矩阵式主页控制面板 ====================
function getHelpHTML(origin) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CDN 多模态矩阵生成器</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:850px;margin:30px auto;padding:0 25px;color:#222;background:#f9fa9b;background-image:linear-gradient(135deg,#f5f7fa 0%,#e4e8f0 100%);min-height:95vh}body,html{margin:0;padding:20px}.card{background:#fff;border-radius:12px;padding:24px;box-shadow:0 8px 24px rgba(0,0,0,0.05);margin-bottom:20px}form{display:flex;gap:10px}input[type="text"]{flex:1;padding:12px;font-size:14px;border:1px solid #dcdfe6;border-radius:6px;outline:none;transition:all .3s}input[type="text"]:focus{border-color:#409eff;box-shadow:0 0 6px rgba(64,158,255,.2)}.btn{padding:12px 20px;color:#fff;border:none;cursor:pointer;font-size:14px;background:#409eff;border-radius:6px;font-weight:500;transition:background .2s}.btn:hover{background:#66b1ff}.btn-group{display:flex;gap:8px;margin-top:10px}.btn-action{padding:5px 10px;font-size:12px;background:#f0f2f5;color:#606266;border:1px solid #dcdfe6;border-radius:4px;cursor:pointer}.btn-action:hover{background:#ecf5ff;color:#409eff;border-color:#c6e2ff}.block-title{font-size:14px;font-weight:600;color:#303133;margin-bottom:8px;display:flex;align-items:center;gap:6px}.block-item{background:#f8f9fa;border-left:4px solid #409eff;padding:14px;border-radius:0 6px 6px 0;margin-bottom:15px}.block-item.big{border-left-color:#e6a23c}.block-item.force{border-left-color:#67c23a}p.uri-p{margin:4px 0;font-size:13px;word-break:break-all;font-family:monospace;color:#1e1f22}code{background:#fff4f4;padding:2px 4px;color:#c7254e;border-radius:3px;font-size:12px}</style></head><body>
    <div class="card">
        <h3 style="margin-top:0;color:#1f2f3d;">🛰️ CDN 智能矩阵多模态外链分发系统</h3>
        <form onsubmit="generateMatrix(); return false;"><input type="text" id="urlInput" placeholder="请输入源站 Gist Raw 原始物理连接..." required><button type="submit" class="btn">生成矩阵直链</button></form>
    </div>
    <div id="matrixContainer" style="display:none;">
        <div class="card">
            <div class="block-item"><div class="block-title">🌐 ① 智能通用自适应档 (Normal Mode) <span>[MODE: 0]</span></div><p class="uri-p" id="url_normal"></p><div class="btn-group"><button class="btn-action" onclick="copyUri('url_normal')">📋 复制直链</button><button class="btn-action" onclick="handleJump('url_normal',event)">🚀 触发跳转 (支持Ctrl/Shift)</button></div></div>
            <div class="block-item big"><div class="block-title">📦 ② 大文件沙盒容灾档 (BigMode - 占位预留) <span>[MODE: 3]</span></div><p class="uri-p" id="url_bigmode"></p><div class="btn-group"><button class="btn-action" onclick="copyUri('url_bigmode')">📋 复制直链</button><button class="btn-action" onclick="handleJump('url_bigmode',event)">🚀 触发跳转 (支持Ctrl/Shift)</button></div></div>
            <div class="block-item force"><div class="block-title">🖼️ ③ 强制图片强制解码档 (Force JPG64 Channel) <span>[MODE: 1]</span></div><p class="uri-p" id="url_jpg64"></p><div class="btn-group"><button class="btn-action" onclick="copyUri('url_jpg64')">📋 复制直链</button><button class="btn-action" onclick="handleJump('url_jpg64',event)">🚀 触发跳转 (支持Ctrl/Shift)</button></div></div>
        </div>
    </div>
    <div class="card">
        <h4 style="margin-top:0;color:#303133;">💡 多模态通道及高级伪装矩阵说明</h4>
        <p style="font-size:13px;color:#606266;line-height:1.6;">• <b>自动名称还原伪装：</b> 生成的链接尾部会自动嗅探源网链中的原始文件名（如 <code>Snipaste_xxx.jpg</code>），从而完美应对社区论坛严格的图像格式过滤规则。同时，下载或另存为将自动恢复出原本真实的主文件名，无需手动重命名。<br>• <b>防测绘安全分离：</b> 分发外链统一跑在独立高匿前缀 <code>${CONFIG.AUTH_PREFIX_SHARE}</code> 之下，MJJ 顺藤摸瓜手动截断链接也无法窥探到当前后台生成面板，实现高强度的假死隐藏。</p>
    </div>
    <script>
        function generateMatrix() {
            let u = document.getElementById('urlInput').value.trim(); if(!u) return;
            if(/^https?:\\/\\//i.test(u)){ u = u.replace(/^https?:\\/\\//i, function(m){ return m.toLowerCase().replace('://', '/'); }); } else if(!/^https?\\//i.test(u)){ u = 'https/' + u; }
            
            // 提取出真正物理文件名
            let rawFileName = "file.jpg";
            const parts = u.split('/');
            const lastPart = parts[parts.length - 1];
            if(lastPart && lastPart.includes('.')) {
                // 如果结尾是 .b64，把其剥离掉还原成图片名
                rawFileName = lastPart.toLowerCase().endsWith('.b64') ? lastPart.slice(0, -4) : lastPart;
            }

            const sharePrefix = "${origin}${CONFIG.AUTH_PREFIX_SHARE}";
            
            // 组装三种矩阵通道
            document.getElementById('url_normal').textContent = sharePrefix + '/' + u + '/' + rawFileName;
            document.getElementById('url_bigmode').textContent = sharePrefix + '/bigmode/' + u + '/' + rawFileName;
            document.getElementById('url_jpg64').textContent = sharePrefix + '/jpg64/' + u + '/' + rawFileName;
            
            document.getElementById('matrixContainer').style.display = 'block';
        }
        function copyUri(id) {
            const text = document.getElementById(id).textContent;
            navigator.clipboard.writeText(text).then(() => { alert("🚀 矩阵链已复制到剪贴板！"); });
        }
        function handleJump(id, event) {
            const url = document.getElementById(id).textContent;
            if(!url) return;
            if (event.ctrlKey || event.metaKey) { window.open(url, '_blank'); } 
            else if (event.shiftKey) { window.location.href = url; } 
            else { window.open(url, '_blank'); }
        }
    </script>
</body></html>`;
}