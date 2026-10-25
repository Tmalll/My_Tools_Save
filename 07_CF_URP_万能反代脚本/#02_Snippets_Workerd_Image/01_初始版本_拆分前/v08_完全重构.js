// =================================================================
// ⚙️ CONFIG：全新重构控制台（功能收敛，极致简单）
// =================================================================
const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD',       // 核心安全前缀
    DEBUG_MODE: 1,                         // 1-开启响应头日志调试并禁用缓存 | 0-生产强缓存
    CACHE_TTL: 2592000,                    // 强缓存时间 (30天)
    MAX_SIZE_KB: 10240,                    // 允许处理的 Base64 最大限制 (10MB)

    // 🎯 核心业务开关
    ALLOW_FALLBACK_DOWNLOAD: 1,            // 0:非图片直接拒绝报错 | 1:非图片自动变成前端解码器下载非图片二进制
    DEFAULT_FAKE_NAME: 'image'             // 补全的默认主文件名
};

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

        // 3. 提取直链携带的真实源站 Raw URL（前端在新标签页打开时传递）
        // 链接结构：/PREFIX/https/gist.github.com/... 或者 /PREFIX/https://...
        let targetPath = url.pathname.substring(pAdmin.length + 2);
        // 处理末尾可能被浏览器或上一版规范补全的 /image.png 伪装后缀，将其剥离还原
        targetPath = targetPath.replace(/\/([^\/]+\.[a-zA-Z0-9]+)$/i, '');

        let targetUrl = parseTargetUrl(targetPath + url.search + url.hash);
        if (!targetUrl) return new Response("Invalid Target URL", { status: 400 });

        // 4. 边缘高速缓存拦截 (仅针对图片生产环境)
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

        // 6. 🚀 核心重构：流式复用判定（Stream Clone，绝不消耗第二次 API）
        const previewStream = upstream.clone();
        const reader = previewStream.body.getReader();
        const { value } = await reader.read(); // 仅读取推送到缓冲区的第一个区块 (Chunk)
        
        const chunkText = new TextDecoder().decode(value).trim().substring(0, 30);
        const cleanChunk = chunkText.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');

        // 7. 判定 Base64 物理魔数特征
        let mimeType = null;
        let fileExt = null;

        if (cleanChunk.startsWith("iVBORw")) { mimeType = "image/png"; fileExt = "png"; }
        else if (cleanChunk.startsWith("/9j/")) { mimeType = "image/jpeg"; fileExt = "jpg"; }
        else if (cleanChunk.startsWith("R0lGOD")) { mimeType = "image/gif"; fileExt = "gif"; }
        else if (cleanChunk.startsWith("UklGR")) { mimeType = "image/webp"; fileExt = "webp"; }

        // 8. 判定结果流分流执行策略
        if (mimeType) {
            // A 方案：图片 Base64 验证成功 -> 继续下载流 -> 解码二进制输出
            const fullBase64Text = await upstream.text();
            try {
                const finalBuffer = decodeBase64(fullBase64Text, CONFIG.MAX_SIZE_KB * 1024);
                const respHeaders = new Headers({
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": mimeType,
                    // 完美补全外部文件名与真实后缀
                    "Content-Disposition": `inline; filename="${CONFIG.DEFAULT_FAKE_NAME}.${fileExt}"`,
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
            // B 方案：非图片或损坏文件 
            if (CONFIG.ALLOW_FALLBACK_DOWNLOAD !== 1) {
                // 掐断连接，拒绝服务
                return new Response("Forbidden: Not a valid image Base64 stream.", { status: 403 });
            }

            // 智能无缝降级：将当前请求页面动态转义为“前端极速解码器”，无感下载非图片二进制原文件
            const fullText = await upstream.text();
            const fallbackHTML = getFallbackDecoderHTML(fullText);
            return new Response(fallbackHTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
    }
};

// =================================================================
// 🧩 UTILS：底层纯净子函数
// =================================================================
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
// 🖥️ HTML：极简控制面板（前端不留任何反代链接，只负责在新标签页触发跳转传递）
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
        
        // 核心跳转逻辑：前端不做任何处理和链接展示，直接拼接扔给后端，由新标签页承接决策
        document.getElementById('btnGo').onclick = function() {
            const val = document.getElementById('urlInput').value.trim();
            if(!val) { alert("请输入有效的 Raw 源站网络外链！"); return; }
            
            // 规范化路径头部
            let cleanUrl = val;
            if(/^https?:\\/\\//i.test(cleanUrl)) {
                cleanUrl = cleanUrl.replace(/^https?:\\/\\//i, function(m){ return m.toLowerCase().replace('://', '/'); });
            } else if(!/^https?\\//i.test(cleanUrl)) {
                cleanUrl = 'https/' + cleanUrl;
            }
            
            const finalJumpUrl = window.location.origin + AUTH_PREFIX + '/' + cleanUrl;
            window.open(finalJumpUrl, '_blank'); // 打开新标签页，直接丢给后端去生成响应
        };

        // 本地编码按钮保留原汁原味
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
// 📦 FALLBACK HTML：动态降级前端二进制解密下载驱动引擎
// =================================================================
function getFallbackDecoderHTML(rawPayload) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>正在落地非图片资产...</title><style>
        body{font-family:sans-serif;background:#f4f6f9;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}
        .card{background:#fff;padding:30px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.1);text-align:center;max-width:400px}
        .loader{border:4px solid #f3f3f3;border-top:4px solid #e6a23c;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto 15px}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
    </style></head><body>
    <div class="card">
        <div class="loader"></div>
        <h3 style="margin:0 0 10px 0;color:#e6a23c">⚠️ 检测到非图片通用流</h3>
        <p style="font-size:13px;color:#666;line-height:1.5;margin:0">系统已自动激活高级无损流降级解密网关，正在在本地沙盒环境中还原二进制原文件，请稍候...</p>
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
                a.download = "downloaded_asset.bin"; // 降级非图片文件补全通用二进制名
                document.body.appendChild(a); a.click();
                
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(dlUrl); window.close(); }, 500);
            } catch(e) {
                alert("前端流解码失败，原数据结构可能已损坏。");
            }
        })();
    </script>
</body></html>`;
}