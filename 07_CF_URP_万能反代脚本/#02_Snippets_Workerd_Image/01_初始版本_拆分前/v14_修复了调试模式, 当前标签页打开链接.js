// =================================================================
// ⚙️ CONFIG & REGISTRY：核心参数与多模态魔数注册表
// =================================================================
const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD',       // 核心安全前缀
    DEBUG_MODE: 1,                         // 1-当前页打开+调试模式(不缓存) | 0-新标签页打开+生产强缓存
    CACHE_TTL: 2592000,                    // 强缓存时间 (30天)
    MAX_SIZE_KB: 10240,                    // 允许处理的 Base64 最大限制 (10MB)
    ALLOW_FALLBACK_DOWNLOAD: 1             // 0:非图片直接拒绝报错 | 1:非图片自动变成前端解码器下载
};

// 🎯 核心业务注册表：严格按照魔数排序，统一图片规范
const MAGIC_REGISTRY = [
    { prefix: "iVBORw", isImage: true,  mime: "image/png",  ext: "png",  fallbackName: "image.png" },
    { prefix: "/9j/",   isImage: true,  mime: "image/jpeg", ext: "jpg",  fallbackName: "image.jpg" },
    { prefix: "R0lGOD", isImage: true,  mime: "image/gif",  ext: "gif",  fallbackName: "image.gif" },
    { prefix: "UklGR",  isImage: true,  mime: "image/webp", ext: "webp", fallbackName: "image.webp" },
    // 最后一项作为通用二进制兜底项
    { prefix: null,     isImage: false, mime: "application/octet-stream", ext: "bin", fallbackName: "UnknownBinary.bin" }
];

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const pAdmin = CONFIG.AUTH_PREFIX.replace(/^\/+|\/+$/g, '');

        // 1. 拦截并分发管理控制面板
        if (url.pathname === '/' + pAdmin || url.pathname === '/' + pAdmin + '/') {
            return new Response(getPanelHTML(), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }

        // 2. 识别是否为反代直链请求
        if (!url.pathname.startsWith('/' + pAdmin + '/')) {
            return new Response("Forbidden: Access Denied", { status: 403 });
        }

        // 3. 提取直链携带的真实源站 Raw URL 路径
        let targetPath = url.pathname.substring(pAdmin.length + 2);
        
        // 🛠️ 【刚性物理判定】：检查当前请求的 pathname 结尾是否真的包含了虚拟图片路径
        const lowerPath = url.pathname.toLowerCase();
        let hasVirtualImageSuffix = false;
        let matchedExt = "";

        // 遍历受信任的虚拟后缀，看当前请求是不是以它们结尾的
        for (const item of MAGIC_REGISTRY) {
            if (item.isImage && lowerPath.endsWith('/image.' + item.ext)) {
                hasVirtualImageSuffix = true;
                matchedExt = item.ext;
                break;
            }
        }
        
        if (hasVirtualImageSuffix) {
            // 精准剔除最末尾的 /image.xxx 虚拟路径，还原出最干净的源站 Raw 链接
            const suffixLength = ('/image.' + matchedExt).length;
            targetPath = targetPath.substring(0, targetPath.length - suffixLength);
        }

        let targetUrl = parseTargetUrl(targetPath + url.search + url.hash);
        if (!targetUrl) return new Response("Invalid Target URL", { status: 400 });

        // 4. 边缘高速缓存拦截 (生产环境)
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) return cachedResponse;
        }

        // 5. 对目标发起标准流式拉取
        const fetchHeaders = new Headers({ "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" });
        let upstream = await fetch(targetUrl, { method: 'GET', headers: fetchHeaders, redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: ${upstream.status}`, { status: upstream.status });

        // 6. 流式复用判定（Stream Clone，提取前30字节判定魔数）
        const previewStream = upstream.clone();
        const reader = previewStream.body.getReader();
        const { value } = await reader.read(); 
        
        const chunkText = new TextDecoder().decode(value).trim().substring(0, 30);
        const cleanChunk = chunkText.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');

        // 7. 扫描注册表获取匹配的格式属性
        let matchedMeta = MAGIC_REGISTRY.find(item => item.prefix && cleanChunk.startsWith(item.prefix));
        if (!matchedMeta) {
            matchedMeta = MAGIC_REGISTRY[MAGIC_REGISTRY.length - 1]; // 掉入通用二进制兜底
        }

        // 8. 🎯 终极分流控制中心
        if (matchedMeta.isImage) {
            // ==================== 【图片模式】 ====================
            
            // 如果判定是图片，且当前的请求 URL 物理末尾没有指定的 /image.xxx 虚拟路径
            // 说明需要强制补齐！直接在这里执行 302 重定向，把当前请求重定向到带虚拟后缀的完美直链
            if (!hasVirtualImageSuffix) {
                const redirectUrl = new URL(request.url);
                redirectUrl.pathname = redirectUrl.pathname.replace(/[\/]+$/, '') + '/image.' + matchedMeta.ext;
                return Response.redirect(redirectUrl.toString(), 302);
            }

            // 如果已经带了物理虚拟后缀，直接开始正常解码并输出渲染单图
            const finalFileName = matchedMeta.fallbackName;
            const fullBase64Text = await upstream.text();
            try {
                const finalBuffer = decodeBase64(fullBase64Text, CONFIG.MAX_SIZE_KB * 1024);
                const respHeaders = new Headers({
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": matchedMeta.mime,
                    "Content-Disposition": `inline; filename="${finalFileName}"`,
                    "Cache-Control": CONFIG.DEBUG_MODE === 1 ? "no-store" : `public, max-age=${CONFIG.CACHE_TTL}`
                });
                if (CONFIG.DEBUG_MODE === 1) respHeaders.set("X-Sniff-Status", "Success-Image-Redirected");

                const response = new Response(finalBuffer, { status: 200, headers: respHeaders });
                if (CONFIG.DEBUG_MODE !== 1) ctx.waitUntil(cache.put(cacheKey, response.clone()));
                return response;
            } catch (e) {
                return new Response(`Decoder Exception: ${e.message}`, { status: 500 });
            }
        } else {
            // ==================== 【二进制模式】 ====================
            // 完美维持原样不动：提取并剥离 .b64 / .base64，若无法获取还原则返回 UnknownBinary.bin
            const finalFileName = resolveBinaryFileName(targetUrl.pathname, matchedMeta.fallbackName);

            if (CONFIG.ALLOW_FALLBACK_DOWNLOAD !== 1) {
                return new Response("Forbidden: Not a valid image Base64 stream.", { status: 403 });
            }

            const fullText = await upstream.text();
            const fallbackHTML = getFallbackDecoderHTML(fullText, finalFileName);
            return new Response(fallbackHTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
    }
};

// =================================================================
// 🧩 FUNCTIONS：专属工具函数
// =================================================================

function resolveBinaryFileName(pathname, fallbackName) {
    let cleanPath = pathname;
    if (cleanPath.includes('%')) {
        try {
            let prev = "";
            while (cleanPath !== prev && cleanPath.includes('%')) {
                prev = cleanPath;
                cleanPath = decodeURIComponent(cleanPath);
            }
        } catch(e) {}
    }

    const index = cleanPath.lastIndexOf('/');
    let lastSeg = index !== -1 ? cleanPath.substring(index + 1) : cleanPath;
    lastSeg = lastSeg.trim();

    const lowerSeg = lastSeg.toLowerCase();
    if (lowerSeg.endsWith('.b64')) {
        lastSeg = lastSeg.slice(0, -4);
    } else if (lowerSeg.endsWith('.base64')) {
        lastSeg = lastSeg.slice(0, -7);
    }

    if (!lastSeg || !lastSeg.includes('.') || lastSeg.toLowerCase() === 'raw') {
        return fallbackName;
    }

    return lastSeg;
}

function parseTargetUrl(path) {
    if (!/^https?[:\/]+/i.test(path)) return null;
    let full = path.replace(/^https?[:\/]+/i, 'https://');
    if (path.startsWith('http/')) full = path.replace(/^http[:\/]+/i, 'http://');
    try { return new URL(full); } catch { return null; }
}

function decodeBase64(rawText, maxBytes) {
    let cleaned = rawText.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
    const mod = cleaned.length % 4;
    if (mod > 1) cleaned += "=".repeat(4 - mod);
    if (cleaned.length > maxBytes) throw new Error("Stream size overflow limit.");
    const binary = atob(cleaned);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) { bytes[i] = binary.charCodeAt(i); }
    return bytes.buffer;
}

// =================================================================
// 🖥️ HTML：控制面板（⚡ 彻底解决 DEBUG_MODE = 1 时的强力拦截行为）
// =================================================================
function getPanelHTML() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CDN 极简中转站</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>
        body{font-family:sans-serif;background:#f4f6f9;color:#333;padding:20px;display:flex;flex-direction:column;align-items:center}
        .box{width:100%;max-width:650px;background:#fff;padding:20px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);margin-top:40px}
        input[type="text"]{width:100%;padding:14px;font-size:14px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;margin-bottom:15px;outline:none}
        input[type="text"]:focus{border-color:#409eff}
        .btn-row{display:flex;gap:12px}
        .btn{flex:1;padding:14px;font-size:14px;color:#fff;background:#409eff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;text-align:center;box-sizing:border-box}
        .btn:hover{background:#66b1ff}.btn-green{background:#67c23a}.btn-green:hover{background:#85ce61}
    </style></head><body>
    <div class="box">
        <h3 style="margin:0 0 15px 0;text-align:center;color:#222">🛰️ CDN 极简中转控制面板</h3>
        <input type="text" id="urlInput" placeholder="直接粘贴各种完整的 RAW URL (支持 Gist Raw, Pastebin Raw 等)...">
        <div class="btn-row">
            <button class="btn" id="btnGo">生成并跳转反代直链</button>
            <button class="btn btn-green" id="btnPick">本地图片转Base64文件</button>
        </div>
        <input type="file" id="fileFile" accept="image/*" style="display:none">
    </div>
    <script>
        const AUTH_PREFIX = "${CONFIG.AUTH_PREFIX}";
        const DEBUG_MODE = ${CONFIG.DEBUG_MODE}; 
        
        document.getElementById('btnGo').onclick = function(e) {
            if(e) { e.preventDefault(); e.stopPropagation(); }
            const val = document.getElementById('urlInput').value.trim();
            if(!val) { alert("请输入有效的 Raw 源站网络外链！"); return false; }
            
            let cleanUrl = val;
            if(/^https?:\\/\\//i.test(cleanUrl)) {
                cleanUrl = cleanUrl.replace(/^https?:\\/\\//i, function(m){ return m.toLowerCase().replace('://', '/'); });
            } else if(!/^https?\\//i.test(cleanUrl)) {
                cleanUrl = 'https/' + cleanUrl;
            }
            
            const finalJumpUrl = window.location.origin + AUTH_PREFIX + '/' + cleanUrl;
            
            // 🎯 【严格强制分流】：DEBUG_MODE=1 绝对不给执行下面的 window.open 机会
            if (DEBUG_MODE === 1) {
                window.location.href = finalJumpUrl;
                return false;
            } else {
                window.open(finalJumpUrl, '_blank');
                return false;
            }
        };

        document.getElementById('btnPick').onclick = function() { document.getElementById('fileFile').click(); };
        document.getElementById('fileFile').onchange = function() {
            if(this.files.length === 0) return;
            const file = this.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                let text = e.target.result;
                if(text.includes("base64,")) text = text.split("base64,")[1];
                const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                const dlUrl = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = dlUrl; a.download = file.name + ".b64";
                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(dlUrl);
                document.getElementById('fileFile').value = "";
            };
            reader.readAsDataURL(file);
        };
    </script>
</body></html>`;
}

// =================================================================
// 📦 FALLBACK HTML：前端沙盒解码落地下载引擎（调试时自动保留标签页）
// =================================================================
function getFallbackDecoderHTML(rawPayload, cleanFileName) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>正在落地资产...</title><style>
        body{font-family:sans-serif;background:#f4f6f9;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}
        .card{background:#fff;padding:30px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.1);text-align:center;max-width:440px}
        .loader{border:4px solid #f3f3f3;border-top:4px solid #e6a23c;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto 15px}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
    </style></head><body>
    <div class="card">
        <div class="loader"></div>
        <h3 style="margin:0 0 10px 0;color:#e6a23c">⚠️ 检测到通用数据流</h3>
        <p style="font-size:13px;color:#333;font-weight:bold;word-break:break-all;margin-bottom:8px">正在还原：${cleanFileName}</p>
        <p style="font-size:12px;color:#666;line-height:1.5;margin:0">系统正在本地环境中还原二进制原始结构，完成后将自动拉起下载...</p>
    </div>
    <script>
        (function() {
            const DEBUG_MODE = ${CONFIG.DEBUG_MODE};
            try {
                const b64Data = \`${rawPayload.replace(/[`\\$]/g, '\\$&')}\`.replace(/[\\r\\n\\s\\t]+/g, '').replace(/^data:[^,]+,/, '');
                const binaryStr = atob(b64Data);
                const len = binaryStr.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) { bytes[i] = binaryStr.charCodeAt(i); }
                
                const blob = new Blob([bytes.buffer], { type: "application/octet-stream" });
                const dlUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = dlUrl;
                a.download = "${cleanFileName}"; 
                document.body.appendChild(a); a.click();
                
                setTimeout(() => { 
                    document.body.removeChild(a); 
                    URL.revokeObjectURL(dlUrl); 
                    // 🎯 如果是调试模式，不要无脑 close 窗口，留着当前页方便看结果
                    if (DEBUG_MODE !== 1) {
                        window.close(); 
                    } else {
                        document.querySelector('.loader').style.display = 'none';
                        document.querySelector('h3').textContent = '✅ 还原下载完成 (调试状态保留页面)';
                        document.querySelector('h3').style.color = '#67c23a';
                    }
                }, 800);
            } catch(e) {
                alert("前端流解码失败，原数据结构可能已损坏。");
            }
        })();
    </script>
</body></html>`;
}