// =================================================================
// CONFIG & REGISTRY：核心参数集中配置
// =================================================================

const CONFIG = {
    // 核心安全前缀 (控制台管理专用)
    AUTH_PREFIX: '/SP3eHm618kN71DD',       
    // 核心分享前缀 (直链反代专用)
    SHARE_PREFIX: '/dis',                  
    // 核心精炼前缀 (精简输出专用中转)
    REFINING_PREFIX: '/ref',               
    // 1-当前页打开+调试模式(不缓存) | 0-新标签页打开+生产强缓存
    DEBUG_MODE: 1,                         
    // 强缓存时间 (30天)
    CACHE_TTL: 2592000,                    
    
    // 【后端控制核心】
    // 后端解码最大允许限制KB (10MB)
    BACKEND_MAX_SIZE_KB: 10240,            
    // 是否允许后端解码无长度(Transfer-Encoding: chunked)的RAW数据 [1:允许 | 0:锁定必须有长度]
    ALLOW_BACKEND_CHUNKED_RAW: 1,          
    // 0:非图片直接拒绝报错 | 1:非图片自动变成前端解码器下载
    ALLOW_FALLBACK_DOWNLOAD: 1,            
    
    // 【前端控制核心】
    // 前端编码大小限制KB (默认15MB)
    FRONTEND_MAX_SIZE_KB: 15360            
};

// 核心业务注册表：严格按照魔数/前缀排序，统一管理媒体流属性
const MAGIC_REGISTRY = [
    { prefix: "iVBORw", isImage: true,  mime: "image/png",  ext: "png",  fallbackName: "image.png" },
    { prefix: "/9j/",   isImage: true,  mime: "image/jpeg", ext: "jpg",  fallbackName: "image.jpg" },
    { prefix: "R0lGOD", isImage: true,  mime: "image/gif",  ext: "gif",  fallbackName: "image.gif" },
    { prefix: "UklGR",  isImage: true,  mime: "image/webp", ext: "webp", fallbackName: "image.webp" },
    { prefix: "AAAAIG", isImage: true,  mime: "image/avif", ext: "avif", fallbackName: "image.avif" },
    { prefix: "PHN2Zy", isImage: true,  mime: "image/svg+xml", ext: "svg", fallbackName: "image.svg" },
    { prefix: "AAABAA", isImage: true,  mime: "image/x-icon", ext: "ico",  fallbackName: "image.ico" },
    { prefix: "Qk0",    isImage: true,  mime: "image/bmp",  ext: "bmp",  fallbackName: "image.bmp" },
    { prefix: "SUkq",   isImage: true,  mime: "image/tiff", ext: "tiff", fallbackName: "image.tiff" },
    { prefix: "TU0A",   isImage: true,  mime: "image/tiff", ext: "tiff", fallbackName: "image.tiff" },
    // 最后一项作为通用二进制兜底项，切勿在其下方添加新规则
    { prefix: null,     isImage: false, mime: "application/octet-stream", ext: "bin", fallbackName: "UnknownBinary.bin" }
];

// =================================================================
// 🎯 SITE 精炼模式注册表 (REFINING_REGISTRY) 线性解析中心
// =================================================================
const REFINING_REGISTRY = [
    {
        name: "GIST",
        shortName: "gis",
        match_group: [
            // 1. 完整长链接带有 commit 40位哈希值和文件后缀名
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/[0-9a-f]{40}\/[^\/]+/i },
            // 2. 长链接带有文件名，但省去了真实 commit 哈希
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/[^\/]+/i },
            // 3. 带有 /raw 但不带文件名的尾缀链接
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})\/raw/i },
            // 4. 标准网页端基础 Gist 链接
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})/i },
            // 5. 冗长的 usercontent 原始带 commit 哈希与文件名直链
            { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/[0-9a-f]{40}\/[^\/]+/i },
            // 6. usercontent 带文件名无 commit 直链
            { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/[^\/]+/i },
            // 7. usercontent 带有用户名的原生末端 raw 链接
            { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})\/raw/i },
            // 8. 新增：usercontent 仅有用户名和ID，无末尾raw的链接 (修复漏掉的场景)
            { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})/i },
            // 9. 只有匿名 ID 的原生短链接
            { regex: /gist\.githubusercontent\.com\/([0-9a-f]{32})\/raw/i },
            // 10. 已经是标准精炼格式的链接
            { regex: /gist\.githubusercontent\.com\/raw\/([0-9a-f]{32})/i }
        ],
        toRaw: (id) => `https://gist.githubusercontent.com/raw/${id}`
    },
    {
        name: "PASTEBIN",
        shortName: "pas",
        match_group: [
            // 1. 标准 raw 直链格式
            { regex: /pastebin\.com\/raw\/([a-zA-Z0-9]{8})/i },
            // 2. 传统网页查看页格式
            { regex: /pastebin\.com\/([a-zA-Z0-9]{8})/i }
        ],
        toRaw: (id) => `https://pastebin.com/raw/${id}`
    }
];

/**
 * 核心精炼处理器：匹配成功输出标准的精炼 raw URL，不匹配则原样退回
 */
function tryRefiningUrl(urlStr) {
    if (!urlStr) return urlStr;
    // 线性遍历各个大类站点
    for (const site of REFINING_REGISTRY) {
        // 线性遍历该站点下的每一个独立正则
        for (const item of site.match_group) {
            const match = urlStr.match(item.regex);
            if (match && match[1]) {
                // 成功摘取匹配组第一项 ID 并拼接返回
                return site.toRaw(match[1]);
            }
        }
    }
    return urlStr;
}

export default {
    /**
     * 主网关入口函数
     */
    async fetch(request, env, ctx) {
        // 本地 workerd 部署 Nginx 反代专用协议与域名修复层
        const realProto = request.headers.get("x-real-scheme") || null;
        const realHost  = request.headers.get("x-real-host") || null;
        if (realProto && realHost) {
            const u = new URL(request.url);
            const fixedUrl = `${realProto}://${realHost}${u.pathname}${u.search}${u.hash}`;
            request = new Request(fixedUrl, {
                method: request.method,
                headers: request.headers,
                body: request.method === "GET" || request.method === "HEAD" ? null : request.body,
                redirect: "manual"
            });
        }

        const url = new URL(request.url);
        const pAdmin = CONFIG.AUTH_PREFIX.replace(/^\/+|\/+$/g, '');
        const pShare = CONFIG.SHARE_PREFIX.replace(/^\/+|\/+$/g, '');
        const pRef   = CONFIG.REFINING_PREFIX.replace(/^\/+|\/+$/g, '');
        const cleanPath = url.pathname.toLowerCase();

        // 1. 浏览器元数据快速熔断处理
        if (cleanPath === '/favicon.ico' || cleanPath === '/apple-touch-icon.png' || 
            cleanPath === '/apple-touch-icon-precomposed.png' || cleanPath === '/site.webmanifest' || 
            cleanPath === '/browserconfig.xml' || cleanPath.includes('android-chrome-')) {
            return new Response(null, { status: 204 });
        }

        // 2. 拦截并分发管理控制面板页面 (依然使用 AUTH_PREFIX)
        if (url.pathname === '/' + pAdmin || url.pathname === '/' + pAdmin + '/') {
            return new Response(getPanelHTML(), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }

        // 3. 【全新特化路由】：如果是精炼中转站请求 (/ref/) 模式，进行完全解耦的独立验证和重定向跳转
        if (url.pathname.startsWith('/' + pRef + '/')) {
            let targetPath = url.pathname.substring(pRef.length + 2);
            let rawTargetUrl = parseTargetUrl(targetPath + url.search + url.hash);
            if (!rawTargetUrl) return new Response("Invalid Target URL for Refining", { status: 400 });

            // 跑一遍精炼匹配
            const refinedUrlStr = tryRefiningUrl(rawTargetUrl.toString());
            
            // 将得到的精炼结果，转换回原系统 dis 接受的非斜杠标准相对路径
            let cleanUrlPart = refinedUrlStr;
            if (/^https?:\/\//i.test(cleanUrlPart)) {
                cleanUrlPart = cleanUrlPart.replace(/^https?:\/\//i, function(m) {
                    return m.toLowerCase().replace('://', '/');
                });
            }

            // 完全不惊动后面流程，直接 302 重定向到 dis 分享直链
            const finalJumpUrl = url.origin + '/' + pShare + '/' + cleanUrlPart;
            return Response.redirect(finalJumpUrl, 302);
        }

        // 4. 安全前缀路由鉴权校验 (原有稳定的 dis 校验直链)
        if (!url.pathname.startsWith('/' + pShare + '/')) {
            return new Response("Forbidden: Access Denied", { status: 403 });
        }

        // 下面完全恢复为 v18 的原始处理，不破坏任何原有属性
        let targetPath = url.pathname.substring(pShare.length + 2);
        let hasVirtualImageSuffix = false;
        let matchedExt = "";

        // 根据当前注册表动态扫描提取安全虚拟图片后缀
        for (const item of MAGIC_REGISTRY) {
            if (item.isImage && cleanPath.endsWith('/image.' + item.ext)) {
                hasVirtualImageSuffix = true;
                matchedExt = item.ext;
                break;
            }
        }
        
        // 若携带安全直链后缀，则精准剔除后缀路径，还原出最干净的源站 Raw 链接
        if (hasVirtualImageSuffix) {
            const suffixLength = ('/image.' + matchedExt).length;
            targetPath = targetPath.substring(0, targetPath.length - suffixLength);
        }

        let targetUrl = parseTargetUrl(targetPath + url.search + url.hash);
        if (!targetUrl) return new Response("Invalid Target URL", { status: 400 });

        // 5. 边缘高速缓存拦截读取
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) return cachedResponse;
        }

        // 6. 对目标源站发起高速拉取
        const fetchHeaders = new Headers();
        const userUA = request.headers.get('User-Agent');
        fetchHeaders.set('User-Agent', userUA || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36');

        let upstream = await fetch(targetUrl, { method: 'GET', headers: fetchHeaders, redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: ${upstream.status}`, { status: upstream.status });

        // 无长度依赖判定开关控制中心
        const contentLength = upstream.headers.get("Content-Length");
        if (!contentLength && CONFIG.ALLOW_BACKEND_CHUNKED_RAW !== 1) {
            return new Response("Forbidden: Streaming without Content-Length is rejected by CONFIG.", { status: 403 });
        }

        // 7. 流式复用前置预检
        const previewStream = upstream.clone();
        const reader = previewStream.body.getReader();
        const { value } = await reader.read(); 
        
        const chunkText = new TextDecoder().decode(value).trim().substring(0, 30);
        const cleanChunk = chunkText.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');

        // 8. 自动化检索注册表，建立格式哈希映射
        let matchedMeta = MAGIC_REGISTRY.find(item => item.prefix && cleanChunk.startsWith(item.prefix));
        if (!matchedMeta) {
            matchedMeta = MAGIC_REGISTRY[MAGIC_REGISTRY.length - 1]; 
        }

        // 9. 多态场景终极分流执行中心
        if (matchedMeta.isImage) {
            // 图片流处理：补全虚拟后缀
            if (!hasVirtualImageSuffix) {
                const redirectUrl = new URL(request.url);
                redirectUrl.pathname = redirectUrl.pathname.replace(/[\/]+$/, '') + '/image.' + matchedMeta.ext;
                return Response.redirect(redirectUrl.toString(), 302);
            }

            const finalFileName = matchedMeta.fallbackName;
            const fullBase64Text = await upstream.text();
            try {
                const finalBuffer = decodeBase64(fullBase64Text, CONFIG.BACKEND_MAX_SIZE_KB * 1024);
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
            // 二进制模式处理 (完美保留 v18 原生 targetUrl 行为，绝不损坏文件名提取)
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
// 🖥️ HTML：控制面板 (完好保留原版，不添加任何按钮和额外逻辑)
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
        .progress-wrapper{width:100%;background:#ebeef5;border-radius:10px;margin-top:15px;display:none;overflow:hidden;position:relative;height:18px}
        .progress-bar{height:100%;width:0%;background:#67c23a;transition:width 0.1s ease}
        .progress-text{position:absolute;width:100%;text-align:center;font-size:11px;font-weight:bold;color:#333;line-height:18px}
    </style></head><body>
    <div class="box">
        <h3 style="margin:0 0 15px 0;text-align:center;color:#222">CDN 极简中转控制面板</h3>
        <input type="text" id="urlInput" placeholder="直接粘贴各种完整的 RAW URL (支持 Gist Raw, Pastebin Raw 等)...">
        <div class="btn-row">
            <button class="btn" id="btnGo">生成并跳转反代直链</button>
            <button class="btn btn-green" id="btnPick">编码文件为Base64</button>
        </div>
        <div class="progress-wrapper" id="progressWrapper">
            <div class="progress-bar" id="progressBar"></div>
            <div class="progress-text" id="progressText">准备编码... 0%</div>
        </div>
        <input type="file" id="fileFile" style="display:none">
    </div>
    <script>
        const SHARE_PREFIX = "${CONFIG.SHARE_PREFIX}";
        const DEBUG_MODE = ${CONFIG.DEBUG_MODE}; 
        const FRONTEND_MAX_SIZE_KB = ${CONFIG.FRONTEND_MAX_SIZE_KB};
        
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
            const finalJumpUrl = window.location.origin + SHARE_PREFIX + '/' + cleanUrl;
            
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
            if (file.size > FRONTEND_MAX_SIZE_KB * 1024) {
                alert("文件大小超过前端限制 (" + (FRONTEND_MAX_SIZE_KB / 1024).toFixed(1) + "MB)，已被强制拦截。");
                this.value = ""; return;
            }

            const wrapper = document.getElementById('progressWrapper');
            const bar = document.getElementById('progressBar');
            const txt = document.getElementById('progressText');
            
            wrapper.style.display = 'block'; bar.style.width = '0%';
            txt.textContent = "正在初始化流读取器...";

            const chunkSize = 1024 * 256; let offset = 0; let binaryString = "";
            const readChunk = () => {
                const reader = new FileReader();
                const blob = file.slice(offset, offset + chunkSize);
                reader.onload = function(e) {
                    const bytes = new Uint8Array(e.target.result);
                    let chunkStr = "";
                    for (let i = 0; i < bytes.length; i++) { chunkStr += String.fromCharCode(bytes[i]); }
                    binaryString += chunkStr; offset += chunkSize;
                    let percent = Math.min(100, Math.floor((offset / file.size) * 100));
                    bar.style.width = percent + '%'; txt.textContent = "正在编码数据流: " + percent + "%";
                    if (offset < file.size) { setTimeout(readChunk, 1); } else {
                        txt.textContent = "正在执行最终打包与哈希映射...";
                        setTimeout(() => {
                            try {
                                const base64Result = btoa(binaryString);
                                const blobOut = new Blob([base64Result], { type: "text/plain;charset=utf-8" });
                                const dlUrl = URL.createObjectURL(blobOut);
                                const a = document.createElement('a'); a.href = dlUrl; a.download = file.name + ".b64";
                                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(dlUrl);
                                txt.textContent = "编码并导出成功！";
                            } catch(err) {
                                txt.textContent = "发生致命溢出异常。";
                                alert("Base64 转码失败，原文件可能包含无法识别的系统字符。");
                            } finally {
                                document.getElementById('fileFile').value = "";
                                setTimeout(() => { wrapper.style.display = 'none'; }, 3000);
                            }
                        }, 50);
                    }
                };
                reader.readAsArrayBuffer(blob);
            };
            readChunk();
        };
    </script>
</body></html>`;
}

// =================================================================
// 📦 FALLBACK HTML：前端沙盒流式分块还原下载引擎
// =================================================================
function getFallbackDecoderHTML(rawPayload, cleanFileName) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>正在落地资产...</title><style>
        body{font-family:sans-serif;background:#f4f6f9;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}
        .card{background:#fff;padding:30px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.1);text-align:center;width:100%;max-width:440px;box-sizing:border-box}
        .progress-wrapper{width:100%;background:#ebeef5;border-radius:10px;margin-top:20px;overflow:hidden;position:relative;height:18px}
        .progress-bar{height:100%;width:0%;background:#e6a23c;transition:width 0.1s ease}
        .progress-text{position:absolute;width:100%;left:0;top:0;text-align:center;font-size:11px;font-weight:bold;color:#333;line-height:18px}
    </style></head><body>
    <div class="card">
        <h3 id="statusTitle" style="margin:0 0 10px 0;color:#e6a23c">正在落地通用数据流</h3>
        <p style="font-size:13px;color:#333;font-weight:bold;word-break:break-all;margin-bottom:8px">正在还原：${cleanFileName}</p>
        <p style="font-size:12px;color:#666;line-height:1.5;margin:0">系统正在分块解码并还原物理二进制结构，请勿关闭窗口...</p>
        
        <div class="progress-wrapper">
            <div class="progress-bar" id="progressBar"></div>
            <div class="progress-text" id="progressText">准备解码... 0%</div>
        </div>
    </div>
    <script>
        (function() {
            const DEBUG_MODE = ${CONFIG.DEBUG_MODE};
            const bar = document.getElementById('progressBar');
            const txt = document.getElementById('progressText');
            const title = document.getElementById('statusTitle');
            
            try {
                const rawB64 = \`${rawPayload.replace(/[`\\$]/g, '\\$&')}\`.replace(/[\\r\\n\\s\\t]+/g, '').replace(/^data:[^,]+,/, '');
                const totalLen = rawB64.length;
                
                let binaryStr = "";
                let offset = 0;
                const chunkSize = 1024 * 512; 
                
                const decodeChunk = () => {
                    const segment = rawB64.substring(offset, offset + chunkSize);
                    binaryStr += atob(segment);
                    offset += chunkSize;
                    
                    let percent = Math.min(100, Math.floor((offset / totalLen) * 100));
                    bar.style.width = percent + '%';
                    txt.textContent = "正在本地解码中: " + percent + "%";
                    
                    if (offset < totalLen) {
                        setTimeout(decodeChunk, 1);
                    } else {
                        txt.textContent = "正在装配原始文件指针...";
                        setTimeout(() => {
                            const len = binaryStr.length;
                            const bytes = new Uint8Array(len);
                            for (let i = 0; i < len; i++) { bytes[i] = binaryStr.charCodeAt(i); }
                            
                            const blob = new Blob([bytes.buffer], { type: "application/octet-stream" });
                            const dlUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = dlUrl; a.download = "${cleanFileName}"; 
                            document.body.appendChild(a); a.click();
                            
                            setTimeout(() => { 
                                document.body.removeChild(a); URL.revokeObjectURL(dlUrl); 
                                if (DEBUG_MODE !== 1) {
                                    window.close(); 
                                } else {
                                    bar.style.backgroundColor = '#67c23a';
                                    title.textContent = '还原下载完成 (调试状态保留页面)';
                                    title.style.color = '#67c23a';
                                    txt.textContent = "100% 落地完成";
                                }
                            }, 800);
                        }, 50);
                    }
                };
                
                decodeChunk();
                
            } catch(e) {
                txt.textContent = "解码故障";
                alert("前端流解码失败，原数据结构可能已损坏或含有截断。");
            }
        })();
    </script>
</body></html>`;
}