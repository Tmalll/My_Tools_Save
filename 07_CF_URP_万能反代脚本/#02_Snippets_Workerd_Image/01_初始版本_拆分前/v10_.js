// =================================================================
// ⚙️ CONFIG & REGISTRY：核心参数与多模态魔数注册表
// =================================================================
const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD',       // 核心安全前缀
    DEBUG_MODE: 1,                         // 1-开启响应头日志调试并禁用缓存 | 0-生产强缓存
    CACHE_TTL: 2592000,                    // 强缓存时间 (30天)
    MAX_SIZE_KB: 10240,                    // 允许处理的 Base64 最大限制 (10MB)
    ALLOW_FALLBACK_DOWNLOAD: 1             // 0:非图片直接拒绝报错 | 1:非图片自动变成前端解码器下载
};

// 🎯 全面收拢的独立业务注册表 (不再写任何硬编码魔数判定)
const MAGIC_REGISTRY = [
    { prefix: "iVBORw", mime: "image/png",  ext: "png",  fallbackName: "image.png",       isImage: true },
    { prefix: "/9j/",   mime: "image/jpeg", ext: "jpg",  fallbackName: "image.jpg",       isImage: true },
    { prefix: "R0lGOD", mime: "image/gif",  ext: "gif",  fallbackName: "image.gif",       isImage: true },
    { prefix: "UklGR",  mime: "image/webp", ext: "webp", fallbackName: "image.webp",      isImage: true },
    // 兜底项：当所有已知图片魔数都匹配不上时，落入通用二进制逻辑
    { prefix: null,     mime: "application/octet-stream", ext: "bin", fallbackName: "UnknownBinary.bin", isImage: false }
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

        // 3. 提取直链携带的真实源站 Raw URL
        const targetPath = url.pathname.substring(pAdmin.length + 2);
        let targetUrl = parseTargetUrl(targetPath + url.search + url.hash);
        if (!targetUrl) return new Response("Invalid Target URL", { status: 400 });

        // 4. 边缘高速缓存拦截 (生产环境)
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) return cachedResponse;
        }

        // 5. 对目标发起 1 次标准流式拉取
        const fetchHeaders = new Headers({ "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" });
        let upstream = await fetch(targetUrl, { method: 'GET', headers: fetchHeaders, redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: ${upstream.status}`, { status: upstream.status });

        // 6. 流式复用判定（Stream Clone，1 次请求不消耗额外的上游计费）
        const previewStream = upstream.clone();
        const reader = previewStream.body.getReader();
        const { value } = await reader.read(); 
        
        const chunkText = new TextDecoder().decode(value).trim().substring(0, 30);
        const cleanChunk = chunkText.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');

        // 7. 🎯 扫描注册表获取匹配的格式属性
        let matchedMeta = MAGIC_REGISTRY.find(item => item.prefix && cleanChunk.startsWith(item.prefix));
        if (!matchedMeta) {
            // 没有匹配到任何已知图片魔数，落入最后的通用二进制兜底
            matchedMeta = MAGIC_REGISTRY[MAGIC_REGISTRY.length - 1];
        }

        // 8. 🎯 调用独立计算函数：纯切片逻辑解析真实输出文件名
        const finalFileName = resolveFileName(targetUrl.pathname, matchedMeta.fallbackName);

        // 9. 根据注册表声明的类型分流输出
        if (matchedMeta.isImage) {
            // A 方案：图片流程 -> 解码输出二进制
            const fullBase64Text = await upstream.text();
            try {
                const finalBuffer = decodeBase64(fullBase64Text, CONFIG.MAX_SIZE_KB * 1024);
                const respHeaders = new Headers({
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": matchedMeta.mime,
                    "Content-Disposition": `inline; filename="${encodeURIComponent(finalFileName)}"`,
                    "Cache-Control": CONFIG.DEBUG_MODE === 1 ? "no-store" : `public, max-age=${CONFIG.CACHE_TTL}`
                });
                if (CONFIG.DEBUG_MODE === 1) respHeaders.set("X-Sniff-Status", "Success-Image");

                const response = new Response(finalBuffer, { status: 200, headers: respHeaders });
                if (CONFIG.DEBUG_MODE !== 1) ctx.waitUntil(cache.put(cacheKey, response.clone()));
                return response;
            } catch (e) {
                return new Response(`Decoder Exception: ${e.message}`, { status: 500 });
            }
        } else {
            // B 方案：二进制流程 
            if (CONFIG.ALLOW_FALLBACK_DOWNLOAD !== 1) {
                return new Response("Forbidden: Not a valid image Base64 stream.", { status: 403 });
            }

            // 动态变成前端下载沙盒
            const fullText = await upstream.text();
            const fallbackHTML = getFallbackDecoderHTML(fullText, finalFileName);
            return new Response(fallbackHTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
    }
};

// =================================================================
// 🧩 FUNCTIONS：简单明了的专属工具函数
// =================================================================

/**
 * 🎯 严格遵循指示重写的文件名切片逻辑
 */
function resolveFileName(pathname, fallbackName) {
    // 1. 获取最后一个 '/' 之后的那一段文本
    const index = pathname.lastIndexOf('/');
    let lastSeg = index !== -1 ? pathname.substring(index + 1) : pathname;

    // 2. 尝试还原可能存在的特殊 URL 编码（比如中文文件名处理）
    if (lastSeg.includes('%')) {
        try {
            let prev = "";
            while (lastSeg !== prev && lastSeg.includes('%')) {
                prev = lastSeg;
                lastSeg = decodeURIComponent(lastSeg);
            }
        } catch(e) {}
    }

    // 3. 严格规则检查：有 .b64 或 .base64 就切掉返回，没有就使用对应的注册表兜底名
    const lowerSeg = lastSeg.toLowerCase();
    if (lowerSeg.endsWith('.b64')) {
        return lastSeg.slice(0, -4);
    } else if (lowerSeg.endsWith('.base64')) {
        return lastSeg.slice(0, -7);
    }

    // 4. 如果是纯 32 位哈希散列或者是空文本、亦或完全不带 .b64 后缀，无脑返回兜底名
    if (!lastSeg || /^[a-fA-F0-9]{32}$/.test(lastSeg) || lastSeg.toLowerCase() === 'raw') {
        return fallbackName;
    }

    // 兜底返回原名
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
// 🖥️ HTML：控制面板（精简至极，仅负责跳转）
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
        
        document.getElementById('btnGo').onclick = function() {
            const val = document.getElementById('urlInput').value.trim();
            if(!val) { alert("请输入有效的 Raw 源站网络外链！"); return; }
            
            let cleanUrl = val;
            if(/^https?:\\/\\//i.test(cleanUrl)) {
                cleanUrl = cleanUrl.replace(/^https?:\\/\\//i, function(m){ return m.toLowerCase().replace('://', '/'); });
            } else if(!/^https?\\//i.test(cleanUrl)) {
                cleanUrl = 'https/' + cleanUrl;
            }
            
            const finalJumpUrl = window.location.origin + AUTH_PREFIX + '/' + cleanUrl;
            window.open(finalJumpUrl, '_blank');
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
// 📦 FALLBACK HTML：前端沙盒解码落地下载引擎
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
        <p style="font-size:12px;color:#666;line-height:1.5;margin:0">系统正在本地环境中还原二进制原始结构，完成后将自动拉起下载并关闭窗口...</p>
    </div>
    <script>
        (function() {
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
                
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(dlUrl); window.close(); }, 800);
            } catch(e) {
                alert("前端流解码失败，原数据结构可能已损坏。");
            }
        })();
    </script>
</body></html>`;
}