const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD', // 全局安全前缀
    DEBUG_CACHE_MODE: 1,             // 🔥 临时强制改为 1：禁用所有边缘缓存和复制，排除克隆爆内存
    ONLY_ALLOW_IMAGE: 1,             // 1: 严格限制仅允许图片相关路由 | 0: 允许所有文件
    MAX_ALLOWED_BASE64_LEN: 5242880, // 🔥 安全熔断：限制 Base64 文本最大 5MB (约 3.7MB 原图)，防止超大文件直接整垮沙盒

    // ==================== 🛠️ 智能路由注册表 ====================
    ROUTE_REGISTRY: {
        'normal':       { set_path: '',            is_b64: 0, set_mime: 'AUTO_MAP' },
        
        'is-jpg':       { set_path: 'is-jpg',       is_b64: 0, set_mime: 'image/jpeg' },
        'is-jpg-b64':   { set_path: 'is-jpg-b64',   is_b64: 1, set_mime: 'image/jpeg' },
        
        'is-png':       { set_path: 'is-png',       is_b64: 0, set_mime: 'image/png' },
        'is-png-b64':   { set_path: 'is-png-b64',   is_b64: 1, set_mime: 'image/png' },
        
        'is-gif':       { set_path: 'is-gif',       is_b64: 0, set_mime: 'image/gif' },
        'is-gif-b64':   { set_path: 'is-gif-b64',   is_b64: 1, set_mime: 'image/gif' },
        
        'is-webp':      { set_path: 'is-webp',      is_b64: 0, set_mime: 'image/webp' },
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

        const originalPathname = target.pathname.toLowerCase();
        const isUrlB64Ext = originalPathname.endsWith('.b64');
        const simFilename = isUrlB64Ext ? originalPathname.slice(0, -4) : originalPathname;
        const extMatch = simFilename.match(/\.([a-zA-Z0-9]+)$/);
        const extension = extMatch ? extMatch[1] : "";

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

        const headers = new Headers();
        headers.set("Host", target.hostname);
        headers.set("User-Agent", request.headers.get('User-Agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        console.log("=== 开始拉取源站 ===");
        let upstream = await fetch(target, { method: 'GET', headers, redirect: "follow" });
        if (upstream.status !== 200) {
            return new Response(`Upstream Error: Status ${upstream.status}`, { status: upstream.status });
        }

        let finalBody;
        if (needDecode) {
            try {
                console.log("[断点 1] 开始读取源站 Text...");
                let base64Text = await upstream.text();
                
                console.log("[断点 2] 成功获取文本，原始长度:", base64Text.length);
                
                // 1. 清洗换行与空白
                base64Text = base64Text.replace(/[\r\n\s\t]+/g, '');
                // 2. 剔除 Data URL 头
                base64Text = base64Text.replace(/^data:[^,]+,/, '');
                
                // 3. 补齐 Padding
                while (base64Text.length % 4 !== 0) {
                    base64Text += '=';
                }

                console.log("[断点 3] 规整清洗完毕，有效 base64 len:", base64Text.length);

                // 熔断保护防止爆内存
                if (base64Text.length > CONFIG.MAX_ALLOWED_BASE64_LEN) {
                    console.log("🚨 触发安全熔断：文件体积过大，已被拒绝");
                    return new Response(`Forbidden: File size is too large for Worker memory limitations.`, { status: 413 });
                }

                console.log("[断点 4] 准备执行 atob 解码...");
                const binaryString = atob(base64Text);
                console.log("[断点 5] atob 成功，解密二进制串长度 decoded len:", binaryString.length);

                console.log("[断点 6] 准备分配 Uint8Array 内存并进入循环...");
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                console.log("[断点 7] 循环映射完成，成功构建缓冲体！");
                finalBody = bytes.buffer;

            } catch (e) {
                console.log("🚨 解码块发生异常捕获:", e.message);
                return new Response(`[Decoder Error] Base64 processing failed: ${e.message}`, { status: 500 });
            }
        } else {
            finalBody = await upstream.arrayBuffer();
        }

        const respHeaders = new Headers();
        respHeaders.set("Access-Control-Allow-Origin", "*");
        respHeaders.set("Content-Type", finalMime);
        respHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

        console.log("=== 正在输出最终 Response ===");
        return new Response(finalBody, { status: 200, headers: respHeaders });
    }
};

// 自动生成的多模态控制面板
function getHelpHTML(origin) {
    const PANEL_TITLE = "Gist 智能图片反代多模态系统";
    const prefix = `${origin}${CONFIG.AUTH_PREFIX}`;

    const radiosHtml = Object.entries(CONFIG.ROUTE_REGISTRY).map(([key, cfg], i) => 
        `<label><input type="radio" name="mode" value="${key}" ${i===0?'checked':''}> ${key}</label>`
    ).join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${PANEL_TITLE}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;max-width:700px;margin:25px auto;padding:0 20px;color:#333;line-height:1.5}.panel{background:#f5f5f5;padding:12px;border-radius:6px;margin:15px 0}form{display:flex;margin-bottom:8px}input[type="text"]{flex:1;padding:7px;font-size:14px;border:1px solid #ccc;border-radius:4px 0 0 4px;outline:none}.btn{padding:7px 14px;color:#fff;border:none;cursor:pointer;font-size:14px;background:#0076ff;border-radius:0 4px 4px 0}#btnGo:hover{background:#005ecf}label{margin-right:10px;font-size:12px;display:inline-block;cursor:pointer;background:#fff;padding:3px 6px;border:1px solid #ddd;border-radius:4px;margin-bottom:5px}p{margin:3px 0;font-size:13px;word-break:break-all}code{background:#e8e8e8;padding:1px 3px;border-radius:3px;font-size:11px}.result-card{display:none;background:#ffffff;border:1px solid #e0e0e0;border-left:5px solid #28a745;padding:12px;border-radius:4px;margin:15px 0;box-shadow:0 4px 6px rgba(0,0,0,0.08)}.result-card .title{font-size:12px;color:#666;margin-bottom:4px;font-weight:bold}.result-card input{background:#f9f9f9;border:1px solid #ddd;padding:5px;width:98%;font-family:monospace;font-size:12px}</style></head><body>
    <h3>${PANEL_TITLE}</h3>
    <div class="panel">
        <form id="proxyForm" onsubmit="buildProxyUrl(); return false;"><input type="text" id="urlInput" placeholder="输入 Gist Raw 链接" required><button type="submit" class="btn">生成</button></form>
        <div style="margin-top:5px;">${radiosHtml}</div>
    </div>
    <div id="resultArea" class="result-card">
        <div class="title">🔗 转换后的反代直链:</div>
        <p><a id="resultLink" href="#" target="_blank"></a></p>
        <div class="title" style="margin-top:10px;">📝 BBCode 发帖格式:</div>
        <input type="text" id="bbcodeOutput" readonly onclick="this.select()">
    </div>
    <p><b>💡 模式说明：</b></p>
    <p>• <code>normal</code>: 自动档。根据 URL 后缀自动判断。遇到 <code>.b64</code> 自动解码并映射 MIME。</p>
    <p>• <code>is-xxx-b64</code>: 强解码档。无视目标 URL 的任何后缀，强制拉回并按 Base64 解码，并强推指定图片头。</p>
    <script>
        function buildProxyUrl() {
            let u = document.getElementById('urlInput').value.trim(); if(!u) return;
            const mode = document.querySelector('input[name="mode"]:checked').value;
            if(/^https?:\\/\\//i.test(u)){ u = u.replace(/^https?:\\/\\//i, function(m){ return m.toLowerCase().replace('://', '/'); }); } else if(!/^https?\\//i.test(u)){ u = 'https/' + u; }
            const modeSegment = mode === 'normal' ? '' : '/' + mode;
            const finalUrl = '${prefix}' + modeSegment + '/' + u;
            document.getElementById('resultLink').href = finalUrl;
            document.getElementById('resultLink').textContent = finalUrl;
            document.getElementById('bbcodeOutput').value = '[img]' + finalUrl + '[/img]';
            document.getElementById('resultArea').style.display = 'block';
        }
    </script>
</body></html>`;
}