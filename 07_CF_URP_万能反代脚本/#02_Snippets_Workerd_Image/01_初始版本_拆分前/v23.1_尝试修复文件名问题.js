// =================================================================
// ⚙️ CONFIG & REGISTRY：参数配置与媒体流业务表（保留核心注释说明）
// =================================================================
const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD',       // 核心安全前缀（控制台管理专用）
    SHARE_PREFIX: '/dis',                  // 核心分享前缀（直链反代专用）
    REFINING_PREFIX: '/ref',               // 精炼中转站路由（自动解析并规范化URL）
    ShortName_PREFIX: '/sho',              // 超简短路由中转层（外显干净链接）
    hide64_PREFIX: '/hid',                 // Base64 隐身中转路由（防止原链接泄露）
    DECODE_B64_PREFIX: '/dcb',             // 解码 Base64 隐身模式路由
    DEBUG_MODE: 1,                         // 1-当前页打开+调试模式(不缓存) | 0-生产强缓存模式
    CACHE_TTL: 2592000,                    // 强缓存时间（秒，默认30天）
    BACKEND_MAX_SIZE_KB: 10240,            // 后端解码最大允许限制KB（10MB）
    ALLOW_BACKEND_CHUNKED_RAW: 1,          // 是否允许流式无长度数据（1:允许 | 0:锁定必须有长度）
    ALLOW_FALLBACK_DOWNLOAD: 1,            // 0:非图片拒绝报错 | 1:自动变成前端解码器落地下载
    FRONTEND_MAX_SIZE_KB: 15360            // 前端编码大小限制KB（默认15MB）
};

// 核心业务注册表：魔数检测、MIME类型及下载兜底映射
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
    { prefix: null,     isImage: false, mime: "application/octet-stream", ext: "bin", fallbackName: "UnknownBinary.bin" }
];

// 支持精炼和缩写的第三方 Raw 托管源站配置列表
const REFINING_REGISTRY = [
    {
        name: "GIST",
        shortName: "gis",
        ref_URL: "https://gist.githubusercontent.com/raw/",
        match_group: [
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/[0-9a-f]{40}\/([^\/\?#]+)/i, hasFile: true },
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/([^\/\?#]+)/i, hasFile: true },
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})\/raw/i, hasFile: false },
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})/i, hasFile: false },
            { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/[0-9a-f]{40}\/([^\/\?#]+)/i, hasFile: true },
            { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/([^\/\?#]+)/i, hasFile: true },
            { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})\/raw/i, hasFile: false },
            { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})/i, hasFile: false },
            { regex: /gist\.githubusercontent\.com\/raw\/([0-9a-f]{32})\/([^\/\?#]+)/i, hasFile: true },
            { regex: /gist\.githubusercontent\.com\/raw\/([0-9a-f]{32})/i, hasFile: false }
        ],
        toRaw: (id) => `https://gist.githubusercontent.com/raw/${id}`
    },
    {
        name: "PASTEBIN",
        shortName: "pas",
        ref_URL: "https://pastebin.com/raw/",
        match_group: [
            { regex: /pastebin\.com\/raw\/([a-zA-Z0-9]{8})/i, hasFile: false },
            { regex: /pastebin\.com\/([a-zA-Z0-9]{8})/i, hasFile: false }
        ],
        toRaw: (id) => `https://pastebin.com/raw/${id}`
    }
];

// =================================================================
// 🛠️ HELPER FUNCTIONS：工具函数模块
// =================================================================

/**
 * 核心 URL 解析与精炼匹配器
 * 用途：检查输入链接是否命中托管源注册表，若命中则提取唯一哈希 ID 并捕获可能存在的原始文件名
 */
function tryRefiningUrlEx(urlStr) {
    if (!urlStr) return null;
    for (const site of REFINING_REGISTRY) {
        for (const item of site.match_group) {
            const match = urlStr.match(item.regex);
            if (match && match[1]) {
                let webFileName = "";
                if (item.hasFile && match[2]) {
                    webFileName = match[2];
                }
                return {
                    id: match[1],
                    siteConfig: site,
                    refinedUrlStr: site.toRaw(match[1]),
                    webFileName: webFileName
                };
            }
        }
    }
    return null;
}

/**
 * 原始文件名清理器
 * 用途：规范化从网页获取到的文件名，剔除 .b64 或 .base64 后缀，还原其真实文件本质
 */
function cleanOriginalName(webFileName) {
    if (!webFileName) return "";
    let name = webFileName;
    const lower = name.toLowerCase();
    if (lower.endsWith('.b64')) {
        name = name.slice(0, -4);
    } else if (lower.endsWith('.base64')) {
        name = name.slice(0, -7);
    }
    return name;
}

/**
 * 解析并生成标准的真实目标 URL 指针
 * 用途：将反代路径中的规范化格式补齐为标准的 http/https 协议请求对象
 */
function parseTargetUrl(path) {
    if (!/^https?[:\/]+/i.test(path)) return null;
    let full = path.replace(/^https?[:\/]+/i, 'https://');
    if (path.startsWith('http/')) full = path.replace(/^http[:\/]+/i, 'http://');
    try { return new URL(full); } catch { return null; }
}

/**
 * 终极文件下载名恢复器
 * 用途：多重尝试解码并推导最合理的文件落地名称（完美支持多重 URL 编码及虚拟路径提取）
 */
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

    if (!lastSeg || !lastSeg.includes('.') || lastSeg.toLowerCase() === 'raw' || /^image\./i.test(lastSeg)) {
        return fallbackName;
    }
    return lastSeg;
}

/**
 * 后端强力 Base64 解码器
 * 用途：将上游拉取到的 Base64 纯文本数据块，高效且安全地还原为底层二进制物理二进制字节数组
 */
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
// 🚀 CORE ENGINE：Cloudflare Workers 核心事件分发处理器
// =================================================================
export default {
    async fetch(request, env, ctx) {
        // A. 解决特定网关或 CDN 反代可能造成的 Host 混淆协议头还原
        const realProto = request.headers.get("x-real-scheme") || null;
        const realHost  = request.headers.get("x-real-host") || null;
        if (realProto && realHost) {
            const u = new URL(request.url);
            request = new Request(`${realProto}://${realHost}${u.pathname}${u.search}${u.hash}`, {
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
        const pSho   = CONFIG.ShortName_PREFIX.replace(/^\/+|\/+$/g, '');
        const pHid   = CONFIG.hide64_PREFIX.replace(/^\/+|\/+$/g, '');
        const pDcb   = CONFIG.DECODE_B64_PREFIX.replace(/^\/+|\/+$/g, '');
        const cleanPath = url.pathname.toLowerCase();

        // B. 拦截并阻止无意义的各种静态探测，保障运行能效
        if (cleanPath === '/favicon.ico' || cleanPath === '/apple-touch-icon.png' || 
            cleanPath === '/apple-touch-icon-precomposed.png' || cleanPath === '/site.webmanifest' || 
            cleanPath === '/browserconfig.xml' || cleanPath.includes('android-chrome-')) {
            return new Response(null, { status: 204 });
        }

        // C. 后端管理台控制面板接入点
        if (url.pathname === '/' + pAdmin || url.pathname === '/' + pAdmin + '/') {
            return new Response(getPanelHTML(), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }

        // D. Base64 隐身中转生成路由 (/hid/)
        if (url.pathname.startsWith('/' + pHid + '/')) {
            let targetPath = url.pathname.substring(pHid.length + 2);
            let rawTargetUrl = parseTargetUrl(targetPath + url.search + url.hash);
            if (!rawTargetUrl) return new Response("Invalid Target URL for Hide Mode", { status: 400 });

            const res = tryRefiningUrlEx(rawTargetUrl.toString());
            if (res) {
                const pathString = `${res.siteConfig.shortName}/${res.id}`;
                const encodedPart = btoa(pathString).replace(/=/g, ''); 
                
                const origName = cleanOriginalName(res.webFileName);
                const finalHideUrl = origName 
                    ? `${url.origin}/${pDcb}/${encodedPart}/${origName}`
                    : `${url.origin}/${pDcb}/${encodedPart}/image.png`;
                return Response.redirect(finalHideUrl, 302);
            } else {
                let cleanUrlPart = rawTargetUrl.toString();
                if (/^https?:\/\//i.test(cleanUrlPart)) {
                    cleanUrlPart = cleanUrlPart.replace(/^https?:\/\//i, function(m) { return m.toLowerCase().replace('://', '/'); });
                }
                return Response.redirect(`${url.origin}/${pShare}/${cleanUrlPart}`, 302);
            }
        }

        // E. 传统简短外显路由中转层 (/sho/)
        if (url.pathname.startsWith('/' + pSho + '/')) {
            let targetPath = url.pathname.substring(pSho.length + 2);
            let rawTargetUrl = parseTargetUrl(targetPath + url.search + url.hash);
            if (!rawTargetUrl) return new Response("Invalid Target URL for Short Mode", { status: 400 });

            const res = tryRefiningUrlEx(rawTargetUrl.toString());
            if (res) {
                const origName = cleanOriginalName(res.webFileName);
                const finalShortUrl = origName
                    ? `${url.origin}/${res.siteConfig.shortName}/${res.id}/${origName}`
                    : `${url.origin}/${res.siteConfig.shortName}/${res.id}/image.png`;
                return Response.redirect(finalShortUrl, 302);
            } else {
                let cleanUrlPart = rawTargetUrl.toString();
                if (/^https?:\/\//i.test(cleanUrlPart)) {
                    cleanUrlPart = cleanUrlPart.replace(/^https?:\/\//i, function(m) { return m.toLowerCase().replace('://', '/'); });
                }
                return Response.redirect(`${url.origin}/${pShare}/${cleanUrlPart}`, 302);
            }
        }

        // F. 精炼中转站路由调度层 (/ref/)
        if (url.pathname.startsWith('/' + pRef + '/')) {
            let targetPath = url.pathname.substring(pRef.length + 2);
            let rawTargetUrl = parseTargetUrl(targetPath + url.search + url.hash);
            if (!rawTargetUrl) return new Response("Invalid Target URL for Refining", { status: 400 });

            const res = tryRefiningUrlEx(rawTargetUrl.toString());
            let cleanUrlPart = res ? res.refinedUrlStr : rawTargetUrl.toString();
            
            if (res && res.webFileName) {
                cleanUrlPart = cleanUrlPart.replace(/[\/]+$/, '') + '/' + res.webFileName;
            }

            if (/^https?:\/\//i.test(cleanUrlPart)) {
                cleanUrlPart = cleanUrlPart.replace(/^https?:\/\//i, function(m) { return m.toLowerCase().replace('://', '/'); });
            }
            return Response.redirect(url.origin + '/' + pShare + '/' + cleanUrlPart, 302);
        }

        // G. 路由别名映射及路由核心处理解耦点（彻底杜绝 GitHub 404 的核心所在）
        let isShortAliasRoute = false;
        let matchedAliasConfig = null;
        let activePathname = url.pathname;
        let extractedVirtualName = ""; // 被捕获并保留的外显虚拟文件名

        // 1. 解码并转换隐身解码路由 (/dcb/)
        if (url.pathname.startsWith('/' + pDcb + '/')) {
            const rawPart = url.pathname.substring(pDcb.length + 2); 
            const firstSlashIndex = rawPart.indexOf('/');
            const base64UrlParam = firstSlashIndex !== -1 ? rawPart.substring(0, firstSlashIndex) : rawPart;
            const remainingSuffix = firstSlashIndex !== -1 ? rawPart.substring(firstSlashIndex) : '';

            if (remainingSuffix && remainingSuffix.startsWith('/')) {
                extractedVirtualName = remainingSuffix.substring(1);
            }

            try {
                let decodedStr = atob(base64UrlParam).trim();
                const firstPartIndex = decodedStr.indexOf('/');
                if (firstPartIndex !== -1) {
                    const sName = decodedStr.substring(0, firstPartIndex);
                    const siteId = decodedStr.substring(firstPartIndex + 1);
                    const targetSite = REFINING_REGISTRY.find(s => s.shortName === sName);
                    if (targetSite) {
                        isShortAliasRoute = true;
                        matchedAliasConfig = targetSite;
                        // 注意：此处重写后的路径不应强带提取的文件名，避免向源站发送时报错404
                        activePathname = `/${sName}/${siteId}`;
                    }
                }
            } catch (e) {
                return new Response("Invalid Hidden Base64 Payload Structure", { status: 400 });
            }
        }

        // 2. 转换传统缩写别名路由（如 /gis/xxxx/filename）
        if (!isShortAliasRoute) {
            for (const site of REFINING_REGISTRY) {
                if (url.pathname.startsWith('/' + site.shortName + '/')) {
                    isShortAliasRoute = true;
                    matchedAliasConfig = site;
                    
                    const rem = url.pathname.substring(site.shortName.length + 2);
                    const remSlash = rem.indexOf('/');
                    if (remSlash !== -1) {
                        extractedVirtualName = rem.substring(remSlash + 1);
                        activePathname = `/${site.shortName}/${rem.substring(0, remSlash)}`;
                    }
                    break;
                }
            }
        }

        // 映射为标准的底层反代服务路径形式
        if (isShortAliasRoute && matchedAliasConfig) {
            const remainingPart = activePathname.substring(matchedAliasConfig.shortName.length + 2);
            const rawUrlPrefix = matchedAliasConfig.ref_URL.replace('://', '/');
            activePathname = '/' + pShare + '/' + rawUrlPrefix + remainingPart;
        }

        if (!activePathname.startsWith('/' + pShare + '/')) {
            return new Response("Forbidden: Access Denied", { status: 403 });
        }

        // H. 裁切虚拟后缀，计算纯净无污染的真实目标源站 URL 
        let targetPath = activePathname.substring(pShare.length + 2);
        let hasVirtualImageSuffix = false;
        let matchedExt = "";

        const lowerActivePath = activePathname.toLowerCase();
        for (const item of MAGIC_REGISTRY) {
            if (item.isImage && lowerActivePath.endsWith('/image.' + item.ext)) {
                hasVirtualImageSuffix = true;
                matchedExt = item.ext;
                break;
            }
        }
        
        if (hasVirtualImageSuffix) {
            const suffixLength = ('/image.' + matchedExt).length;
            targetPath = targetPath.substring(0, targetPath.length - suffixLength);
        }

        let targetUrl = parseTargetUrl(targetPath + url.search + url.hash);
        if (!targetUrl) return new Response("Invalid Target URL", { status: 400 });

        // I. 高效缓存及全局反向代理请求下发
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) return cachedResponse;
        }

        const fetchHeaders = new Headers();
        const userUA = request.headers.get('User-Agent');
        fetchHeaders.set('User-Agent', userUA || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        let upstream = await fetch(targetUrl, { method: 'GET', headers: fetchHeaders, redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: ${upstream.status}`, { status: upstream.status });

        const contentLength = upstream.headers.get("Content-Length");
        if (!contentLength && CONFIG.ALLOW_BACKEND_CHUNKED_RAW !== 1) {
            return new Response("Forbidden: Streaming without Content-Length is rejected.", { status: 403 });
        }

        // J. 智能魔数流式嗅探检测器机制
        const previewStream = upstream.clone();
        const reader = previewStream.body.getReader();
        const { value } = await reader.read(); 
        
        const chunkText = new TextDecoder().decode(value).trim().substring(0, 30);
        const cleanChunk = chunkText.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');

        let matchedMeta = MAGIC_REGISTRY.find(item => item.prefix && cleanChunk.startsWith(item.prefix));
        if (!matchedMeta) {
            matchedMeta = MAGIC_REGISTRY[MAGIC_REGISTRY.length - 1]; 
        }

        // K. 直显媒体资产输出分发层
        if (matchedMeta.isImage) {
            const isImageStaticExt = extractedVirtualName.toLowerCase().endsWith('.' + matchedMeta.ext) || url.pathname.toLowerCase().endsWith('.' + matchedMeta.ext);
            if (!hasVirtualImageSuffix && !isImageStaticExt) {
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
            // L. 纯净二进制资产流式解码并交付落地
            // 优先从携带文件名的虚拟外显组件中提取最原生的名字，若无则智能从当前 URL 树状图推导
            const sourceNamePath = extractedVirtualName ? `/${extractedVirtualName}` : url.pathname;
            const finalFileName = resolveBinaryFileName(sourceNamePath, matchedMeta.fallbackName);

            if (CONFIG.ALLOW_FALLBACK_DOWNLOAD !== 1) {
                return new Response("Forbidden: Not a valid image Base64 stream.", { status: 403 });
            }

            const fullText = await upstream.text();
            return new Response(getFallbackDecoderHTML(fullText, finalFileName), {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }
    }
};

// =================================================================
// 🎨 HTML TEMPLATES：前端控制台与流式反冲页面模板
// =================================================================

/**
 * 渲染前端管理面板 UI
 */
function getPanelHTML() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CDN 极简中转站</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;background:#f4f6f9;color:#333;padding:20px;display:flex;flex-direction:column;align-items:center}.box{width:100%;max-width:650px;background:#fff;padding:20px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);margin-top:40px}input[type="text"]{width:100%;padding:14px;font-size:14px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;margin-bottom:15px;outline:none}input[type="text"]:focus{border-color:#409eff}.btn-row{display:flex;gap:12px}.btn{flex:1;padding:14px;font-size:14px;color:#fff;background:#409eff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;text-align:center;box-sizing:border-box}.btn:hover{background:#66b1ff}.btn-green{background:#67c23a}.btn-green:hover{background:#85ce61}.progress-wrapper{width:100%;background:#ebeef5;border-radius:10px;margin-top:15px;display:none;overflow:hidden;position:relative;height:18px}.progress-bar{height:100%;width:0%;background:#67c23a;transition:width 0.1s ease}.progress-text{position:absolute;width:100%;text-align:center;font-size:11px;font-weight:bold;color:#333;line-height:18px}</style></head><body><div class="box"><h3 style="margin:0 0 15px 0;text-align:center;color:#222">CDN 极简中转控制面板</h3><input type="text" id="urlInput" placeholder="直接粘贴各种完整的 RAW URL..."><div class="btn-row"><button class="btn" id="btnGo">生成并跳转反代直链</button><button class="btn btn-green" id="btnPick">编码文件为Base64</button></div><div class="progress-wrapper" id="progressWrapper"><div class="progress-bar" id="progressBar"></div><div class="progress-text" id="progressText">准备编码... 0%</div></div><input type="file" id="fileFile" style="display:none"></div><script>const SHARE_PREFIX = "${CONFIG.SHARE_PREFIX}";const DEBUG_MODE = ${CONFIG.DEBUG_MODE};const FRONTEND_MAX_SIZE_KB = ${CONFIG.FRONTEND_MAX_SIZE_KB};document.getElementById('btnGo').onclick = function(e) {if(e){e.preventDefault();e.stopPropagation()}const val = document.getElementById('urlInput').value.trim();if(!val){alert("请输入有效的 Raw 源站网络外链！");return false}let cleanUrl = val;if(/^https?:\\/\\//i.test(cleanUrl)){cleanUrl = cleanUrl.replace(/^https?:\\/\\//i, function(m){ return m.toLowerCase().replace('://', '/'); });}else if(!/^https?\\//i.test(cleanUrl)){cleanUrl = 'https/' + cleanUrl;}const finalJumpUrl = window.location.origin + SHARE_PREFIX + '/' + cleanUrl;if (DEBUG_MODE === 1) { window.location.href = finalJumpUrl; return false; } else { window.open(finalJumpUrl, '_blank'); return false; }};document.getElementById('btnPick').onclick = function(){document.getElementById('fileFile').click()};document.getElementById('fileFile').onchange = function(){if(this.files.length===0)return;const file = this.files[0];if(file.size>FRONTEND_MAX_SIZE_KB*1024){alert("文件大小超过前端限制.");this.value="";return}const wrapper = document.getElementById('progressWrapper');const bar = document.getElementById('progressBar');const txt = document.getElementById('progressText');wrapper.style.display='block';bar.style.width='0%';txt.textContent="正在初始化流读取器...";const chunkSize = 1024 * 256;let offset = 0;let binaryString = "";const readChunk = () => {const reader = new FileReader();const blob = file.slice(offset, offset + chunkSize);reader.onload = function(e){const bytes = new Uint8Array(e.target.result);let chunkStr = "";for(let i=0;i<bytes.length;i++){chunkStr+=String.fromCharCode(bytes[i])}binaryString+=chunkStr;offset+=chunkSize;let percent = Math.min(100, Math.floor((offset / file.size) * 100));bar.style.width = percent + '%';txt.textContent = "正在编码数据流: " + percent + "%";if (offset < file.size) { setTimeout(readChunk, 1); } else {txt.textContent = "正在执行最终打包与哈希映射...";setTimeout(() => {try {const base64Result = btoa(binaryString);const blobOut = new Blob([base64Result], { type: "text/plain;charset=utf-8" });const dlUrl = URL.createObjectURL(blobOut);const a = document.createElement('a');a.href = dlUrl;a.download = file.name + ".b64";document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(dlUrl);txt.textContent = "编码并导出成功！";} catch(err) {txt.textContent = "发生致命溢出异常。";} finally {document.getElementById('fileFile').value = "";setTimeout(() => { wrapper.style.display = 'none'; }, 3000);}}, 50);}};reader.readAsArrayBuffer(blob);};readChunk();};</script></body></html>`;
}

/**
 * 渲染前端流式分块本地二进制文件恢复及沙盒自动下载落地 HTML
 */
function getFallbackDecoderHTML(rawPayload, cleanFileName) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>正在落地资产...</title><style>body{font-family:sans-serif;background:#f4f6f9;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}.card{background:#fff;padding:30px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.1);text-align:center;width:100%;max-width:440px;box-sizing:border-box}.progress-wrapper{width:100%;background:#ebeef5;border-radius:10px;margin-top:20px;overflow:hidden;position:relative;height:18px}.progress-bar{height:100%;width:0%;background:#e6a23c;transition:width 0.1s ease}.progress-text{position:absolute;width:100%;left:0;top:0;text-align:center;font-size:11px;font-weight:bold;color:#333;line-height:18px}</style></head><body><div class="card"><h3 id="statusTitle" style="margin:0 0 10px 0;color:#e6a23c">正在落地通用数据流</h3><p style="font-size:13px;color:#333;font-weight:bold;word-break:break-all;margin-bottom:8px">正在还原：${cleanFileName}</p><p style="font-size:12px;color:#666;line-height:1.5;margin:0">系统正在分块解码并还原物理二进制结构...</p><div class="progress-wrapper"><div class="progress-bar" id="progressBar"></div><div class="progress-text" id="progressText">准备解码... 0%</div></div></div><script>(function(){const DEBUG_MODE = ${CONFIG.DEBUG_MODE};const bar = document.getElementById('progressBar');const txt = document.getElementById('progressText');const title = document.getElementById('statusTitle');try {const rawB64 = \`${rawPayload.replace(/[`\\$]/g, '\\$&')}\`.replace(/[\\r\\n\\s\\t]+/g, '').replace(/^data:[^,]+,/, '');const totalLen = rawB64.length;let binaryStr = "";let offset = 0;const chunkSize = 1024 * 512;const decodeChunk = () => {const segment = rawB64.substring(offset, offset + chunkSize);binaryStr += atob(segment);offset += chunkSize;let percent = Math.min(100, Math.floor((offset / totalLen) * 100));bar.style.width = percent + '%';txt.textContent = "正在本地解码中: " + percent + "%";if (offset < totalLen) { setTimeout(decodeChunk, 1); } else {txt.textContent = "正在装配原始文件指针...";setTimeout(() => {const len = binaryStr.length;const bytes = new Uint8Array(len);for (let i = 0; i < len; i++) { bytes[i] = binaryStr.charCodeAt(i); }const blob = new Blob([bytes.buffer], { type: "application/octet-stream" });const dlUrl = URL.createObjectURL(blob);const a = document.createElement('a');a.href = dlUrl; a.download = "${cleanFileName}";document.body.appendChild(a);a.click();setTimeout(() => {document.body.removeChild(a); URL.revokeObjectURL(dlUrl);if (DEBUG_MODE !== 1) { window.close(); } else {bar.style.backgroundColor = '#67c23a';title.textContent = '还原下载完成 (调试状态保留页面)';title.style.color = '#67c23a';txt.textContent = "100% 落地完成";}}, 800);}, 50);}};decodeChunk()}catch(e){txt.textContent = "解码故障";}})();</script></body></html>`;
}