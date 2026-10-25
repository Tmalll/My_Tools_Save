const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD', // 全局安全前缀
    DEBUG_MODE: 1,                   // 🛠️ 调试模式：1-开启响应头日志反馈并禁用缓存 | 0-关闭调试并启用强缓存
    CACHE_TTL: 2592000,              // 边缘强缓存时间（30天）
    ONLY_ALLOW_IMAGE: 1,             // 1: 严格限制仅允许图片路由 | 0: 允许所有文件

    // 提早熔断控制（单位：KB）
    // 对应下载前检查标头，以及有无长度标头时的行为约束
    MAX_ALLOWED_BASE64_SIZE_KB: 5120, // 5120KB = 5MB。允许的源站最大 Base64 文本大小
    ALLOW_UNKNOWN_LENGTH: 1,          // 1: 遇到 Gist 没给 Content-Length 时允许继续下载 | 0: 没有长度直接拒绝

    // ==================== 🛠️ 智能统一路由注册表 ====================
    ROUTE_REGISTRY: {
        'normal':       { set_path: '',             is_b64: 0, set_mime: 'AUTO_MAP' },
        'is-jpg-b64':   { set_path: 'is-jpg-b64',   is_b64: 1, set_mime: 'image/jpeg' },
        'is-png-b64':   { set_path: 'is-png-b64',   is_b64: 1, set_mime: 'image/png' },
        'is-gif-b64':   { set_path: 'is-gif-b64',   is_b64: 1, set_mime: 'image/gif' },
        'is-webp-b64':  { set_path: 'is-webp-b64',  is_b64: 1, set_mime: 'image/webp' }
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
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "*"
                }
            });
        }

        const cleanPrefix = CONFIG.AUTH_PREFIX.replace(/^\/+|\/+$/g, '');
        let path = url.pathname;
        
        if (path === '/' + cleanPrefix || path === '/' + cleanPrefix + '/') {
            path = '/';
        } else if (path.startsWith('/' + cleanPrefix + '/')) {
            path = path.substring(cleanPrefix.length + 1); 
        } else {
            return new Response("Unauthorized", { status: 403 });
        }

        // 🔥 核心重构 [1]: 剥离用于欺骗论坛的虚拟后缀尾巴 (如 /file.jpg 或 /image.png)
        // 从而完美还原出真正的目标文件 URL 供逻辑解析
        path = path.replace(/\/(file|image|show|img)\.[a-zA-Z0-9]+$/i, '');

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

        if (path === '/' && url.search === '') {
            return new Response(getHelpHTML(url.origin), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }        

        let targetPath = path.slice(1) + url.search + url.hash;
        if (!targetPath) return new Response("Missing target path", { status: 400 });

        let target;
        if (/^https?[:\/]+/i.test(targetPath)) {
            let fullTarget = targetPath.replace(/^https?[:\/]+/i, 'https://');
            if (targetPath.startsWith('http/')) fullTarget = targetPath.replace(/^http[:\/]+/i, 'http://');
            try { target = new URL(fullTarget); } catch { return new Response("Invalid target URL", { status: 400 }); }
        } else {
            return new Response("Invalid Proxy Format", { status: 400 });
        }

        // 🔥 核心重构 [3]: 提前对文件名合法性及双后缀格式进行前置审计，不合规直接拒绝
        const originalPathname = target.pathname.toLowerCase();
        const isUrlB64Ext = originalPathname.endsWith('.b64');
        const simFilename = isUrlB64Ext ? originalPathname.slice(0, -4) : originalPathname;
        const extMatch = simFilename.match(/\.([a-zA-Z0-9]+)$/);
        const extension = extMatch ? extMatch[1] : "";

        // 如果在普通路由下结尾又是 .b64，但倒数第二个后缀不是合法图片后缀，直接执行防滥用拦截
        if (modeKey === 'normal' && isUrlB64Ext && !MIME_MAP.hasOwnProperty(extension)) {
            return new Response(`Forbidden: Invalid Double Extension [.${extension}.b64] format detected.`, { status: 400 });
        }

        let finalMime = "application/octet-stream";
        if (currentMode.set_mime === 'AUTO_MAP') {
            finalMime = MIME_MAP[extension] || "application/octet-stream";
        } else {
            finalMime = currentMode.set_mime;
        }

        if (CONFIG.ONLY_ALLOW_IMAGE === 1) {
            const isAllowedImage = Object.values(MIME_MAP).includes(finalMime) || MIME_MAP.hasOwnProperty(extension);
            if (!isAllowedImage) {
                return new Response(`Forbidden: Non-image requests are blocked by policy.`, { status: 403 });
            }
        }

        const needDecode = (currentMode.is_b64 === 1) || (modeKey === 'normal' && isUrlB64Ext);

        // 缓存路由拦截
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) return cachedResponse;
        }

        // 根据同行小哥反馈：彻底移除手工覆盖 Host 标头
        const headers = new Headers();
        headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        
        let upstream = await fetch(target, { method: 'GET', headers, redirect: "follow" });
        if (upstream.status !== 200) {
            return new Response(`Upstream Error: Status ${upstream.status}`, { status: upstream.status });
        }

        // 🔥 核心重构 [1]: 提早进行 Content-Length 长度检查，防止超大文件涌入内存
        const contentLengthStr = upstream.headers.get("content-length");
        const maxAllowedBytes = CONFIG.MAX_ALLOWED_BASE64_SIZE_KB * 1024;

        if (contentLengthStr) {
            const contentLength = parseInt(contentLengthStr, 10);
            if (contentLength > maxAllowedBytes) {
                return new Response(`Forbidden: Content-Length (${contentLength} bytes) exceeds limit.`, { status: 413 });
            }
        } else {
            // 无法判定大小的处理逻辑
            if (CONFIG.ALLOW_UNKNOWN_LENGTH !== 1) {
                return new Response(`Forbidden: Missing Content-Length header while ALLOW_UNKNOWN_LENGTH is disabled.`, { status: 411 });
            }
        }

        let finalBody;
        if (needDecode) {
            try {
                if (CONFIG.DEBUG_MODE === 1) debugHeaders.set("X-Debug-Stage", "1-FetchSuccess");

                let base64Text = await upstream.text();
                if (CONFIG.DEBUG_MODE === 1) debugHeaders.set("X-Debug-Raw-Len", base64Text.length.toString());
                
                // 清洗流程
                base64Text = base64Text.replace(/[\r\n\s\t]+/g, '');
                base64Text = base64Text.replace(/^data:[^,]+,/, '');
                
                // 🔥 核心重构 [2]: 同行提出的严谨 Padding 校验逻辑
                const mod = base64Text.length % 4;
                if (mod === 1) {
                    throw new Error("Invalid Base64 format structure (mod 1)");
                }
                if (mod > 1) {
                    base64Text += "=".repeat(4 - mod);
                }

                if (CONFIG.DEBUG_MODE === 1) debugHeaders.set("X-Debug-Clean-Len", base64Text.length.toString());

                // 二次兜底熔断
                if (base64Text.length > maxAllowedBytes) {
                    return new Response(`Forbidden: Cleaned Base64 stream exceeds memory restriction.`, { status: 413 });
                }

                // 执行纯 JS 原生快速解码
                const binaryString = atob(base64Text);
                if (CONFIG.DEBUG_MODE === 1) debugHeaders.set("X-Debug-Decoded-Len", binaryString.length.toString());

                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                // 🔥 核心重构 [4]: 超轻量图片魔数基础验证（选配强化）
                if (len >= 3 && CONFIG.DEBUG_MODE === 1) {
                    // JPEG: FF D8 FF | PNG: 89 50 4E
                    const magic = `${bytes[0].toString(16).toUpperCase()}${bytes[1].toString(16).toUpperCase()}`;
                    debugHeaders.set("X-Debug-Image-Magic", magic);
                }

                if (CONFIG.DEBUG_MODE === 1) debugHeaders.set("X-Debug-Stage", "3-RenderSuccess");
                finalBody = bytes.buffer;

            } catch (e) {
                const errHeaders = new Headers();
                errHeaders.set("Access-Control-Allow-Origin", "*");
                if (CONFIG.DEBUG_MODE === 1) {
                    errHeaders.set("X-Debug-Error", e.message);
                    errHeaders.set("X-Debug-Last-Stage", debugHeaders.get("X-Debug-Stage") || "unknown");
                }
                return new Response(`[Decoder Error] Base64 processing failed: ${e.message}`, { status: 500, headers: errHeaders });
            }
        } else {
            finalBody = await upstream.arrayBuffer();
        }

        const respHeaders = new Headers();
        respHeaders.set("Access-Control-Allow-Origin", "*");
        respHeaders.set("Content-Type", finalMime);

        if (CONFIG.DEBUG_MODE === 1) {
            respHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
            // 将全部断点日志批量写入 Response Headers
            for (let [key, value] of debugHeaders.entries()) {
                respHeaders.set(key, value);
            }
        } else {
            respHeaders.set("Cache-Control", `public, max-age=${CONFIG.CACHE_TTL}, s-maxage=${CONFIG.CACHE_TTL}, must-revalidate`);
        }

        const finalResponse = new Response(finalBody, { status: 200, headers: respHeaders });

        if (CONFIG.DEBUG_MODE !== 1) {
            ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));
        }

        return finalResponse;
    }
};

function getHelpHTML(origin) {
    const PANEL_TITLE = "Gist 智能图片反代多模态系统";
    const prefix = `${origin}${CONFIG.AUTH_PREFIX}`;
    const radiosHtml = Object.entries(CONFIG.ROUTE_REGISTRY).map(([key, cfg], i) => 
        `<label><input type="radio" name="mode" value="${key}" ${i===0?'checked':''}> ${key}</label>`
    ).join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${PANEL_TITLE}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;max-width:700px;margin:25px auto;padding:0 20px;color:#333;line-height:1.5}.panel{background:#f5f5f5;padding:12px;border-radius:6px;margin:15px 0}form{display:flex;margin-bottom:8px}input[type="text"]{flex:1;padding:7px;font-size:14px;border:1px solid #ccc;border-radius:4px 0 0 4px;outline:none}.btn{padding:7px 14px;color:#fff;border:none;cursor:pointer;font-size:14px;background:#0076ff;border-radius:0 4px 4px 0}label{margin-right:10px;font-size:12px;display:inline-block;cursor:pointer;background:#fff;padding:3px 6px;border:1px solid #ddd;border-radius:4px;margin-bottom:5px}p{margin:3px 0;font-size:13px;word-break:break-all}.result-card{display:none;background:#ffffff;border:1px solid #e0e0e0;border-left:5px solid #28a745;padding:12px;border-radius:4px;margin:15px 0;box-shadow:0 4px 6px rgba(0,0,0,0.08)}.result-card .title{font-size:12px;color:#666;margin-bottom:4px;font-weight:bold}.result-card input{background:#f9f9f9;border:1px solid #ddd;padding:5px;width:98%;font-family:monospace;font-size:12px}</style></head><body>
    <h3>${PANEL_TITLE}</h3>
    <div class="panel">
        <form id="proxyForm" onsubmit="buildProxyUrl(); return false;"><input type="text" id="urlInput" placeholder="输入 Gist Raw 链接" required><button type="submit" class="btn">生成</button></form>
        <div style="margin-top:5px;">${radiosHtml}</div>
    </div>
    <div id="resultArea" class="result-card">
        <div class="title">🔗 转换后的反代直链 (已附加虚拟后缀欺骗论坛):</div>
        <p><a id="resultLink" href="#" target="_blank"></a></p>
        <div class="title" style="margin-top:10px;">📝 BBCode 发帖格式:</div>
        <input type="text" id="bbcodeOutput" readonly onclick="this.select()">
    </div>
    <script>
        function buildProxyUrl() {
            let u = document.getElementById('urlInput').value.trim(); if(!u) return;
            const mode = document.querySelector('input[name="mode"]:checked').value;
            if(/^https?:\\/\\//i.test(u)){ u = u.replace(/^https?:\\/\\//i, function(m){ return m.toLowerCase().replace('://', '/'); }); } else if(!/^https?\\//i.test(u)){ u = 'https/' + u; }
            const modeSegment = mode === 'normal' ? '' : '/' + mode;
            
            // 判定原图可能的类型，追加虚拟后缀欺骗论坛
            let fakeExt = "jpg";
            if(u.toLowerCase().includes(".png")) fakeExt = "png";
            if(u.toLowerCase().includes(".gif")) fakeExt = "gif";
            if(u.toLowerCase().includes(".webp")) fakeExt = "webp";
            
            const finalUrl = '${prefix}' + modeSegment + '/' + u + '/file.' + fakeExt;
            document.getElementById('resultLink').href = finalUrl;
            document.getElementById('resultLink').textContent = finalUrl;
            document.getElementById('bbcodeOutput').value = '[img]' + finalUrl + '[/img]';
            document.getElementById('resultArea').style.display = 'block';
        }
    </script>
</body></html>`;
}