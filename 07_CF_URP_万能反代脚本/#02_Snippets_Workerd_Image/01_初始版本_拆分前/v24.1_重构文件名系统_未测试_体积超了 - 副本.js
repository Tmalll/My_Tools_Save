// =================================================================
// ⚙️ CONFIG & REGISTRY：参数配置与媒体流业务表
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

// 核心业务注册表：魔数检测、MIME类型及下载兜底映射（已严格格式化对齐）
const MAGIC_REGISTRY = [
    { b64_prefix: "iVBORw", isImage: true,  mime: "image/png",     ext: "png",  fallbackName: "image.png" },
    { b64_prefix: "/9j/",   isImage: true,  mime: "image/jpeg",    ext: "jpg",  fallbackName: "image.jpg" },
    { b64_prefix: "R0lGOD", isImage: true,  mime: "image/gif",     ext: "gif",  fallbackName: "image.gif" },
    { b64_prefix: "UklGR",  isImage: true,  mime: "image/webp",    ext: "webp", fallbackName: "image.webp" },
    { b64_prefix: "AAAAIG", isImage: true,  mime: "image/avif",    ext: "avif", fallbackName: "image.avif" },
    { b64_prefix: "PHN2Zy", isImage: true,  mime: "image/svg+xml", ext: "svg",  fallbackName: "image.svg" },
    { b64_prefix: "AAABAA", isImage: true,  mime: "image/x-icon",  ext: "ico",  fallbackName: "image.ico" },
    { b64_prefix: "Qk0",    isImage: true,  mime: "image/bmp",     ext: "bmp",  fallbackName: "image.bmp" },
    { b64_prefix: "SUkq",   isImage: true,  mime: "image/tiff",    ext: "tiff", fallbackName: "image.tiff" },
    { b64_prefix: "TU0A",   isImage: true,  mime: "image/tiff",    ext: "tiff", fallbackName: "image.tiff" },
    { b64_prefix: null,     isImage: false, mime: "application/octet-stream", ext: "bin", fallbackName: "UnknownBinary.bin" }
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
 * 用途：将反代路径中的规范化格式补齐为标准的 http/https 协议请求对象（支持修剪空斜杠）
 */
function parseTargetUrl(path) {
    if (!path) return null;
    let cleanPath = path.replace(/\/+$/, ''); // 去除末尾可能导致反代请求报错的 /
    if (!/^https?[:\/]+/i.test(cleanPath)) return null;
    let full = cleanPath.replace(/^https?[:\/]+/i, 'https://');
    if (cleanPath.startsWith('http/')) full = cleanPath.replace(/^http[:\/]+/i, 'http://');
    try { return new URL(full); } catch { return null; }
}

/**
 * 全局统一文件名决策引擎
 * 用途：整合图片与非图片的全部猜名逻辑。支持循环解 URL 编码，消除 UnknownBinary.bin 兜底，暴露统一变量给业务模块使用
 */
function determineOutputFile(matchedMeta, currentRequestPath) {
    // 逻辑 A：如果魔数判定是图片，直接锁定格式为 image.${ext}
    if (matchedMeta.isImage) {
        return `image.${matchedMeta.ext}`;
    }

    // 逻辑 B：如果判定不是图片，从当前完整的外部请求路径中提取和恢复文件名
    let decodeTarget = currentRequestPath;
    
    // 循环解码 URL，防止多重二次转义编码（例如 %25E6%25B5%259F 恢复为真实中文字符）
    if (decodeTarget.includes('%')) {
        try {
            let previousStr = "";
            while (decodeTarget !== previousStr && decodeTarget.includes('%')) {
                previousStr = decodeTarget;
                decodeTarget = decodeURIComponent(decodeTarget);
            }
        } catch (e) {}
    }

    // 清洗并剔除末尾可能存在的斜杠
    decodeTarget = decodeTarget.replace(/\/+$/, '');

    // 截取最后一个 / 之后的字符片段作为目标名称
    const lastSlashIndex = decodeTarget.lastIndexOf('/');
    let filenameResult = lastSlashIndex !== -1 ? decodeTarget.substring(lastSlashIndex + 1) : decodeTarget;
    filenameResult = filenameResult.trim();

    // 判定并切除可能携带的 .b64 或 .base64 后缀
    const lowerName = filenameResult.toLowerCase();
    if (lowerName.endsWith('.b64')) {
        filenameResult = filenameResult.slice(0, -4);
    } else if (lowerName.endsWith('.base64')) {
        filenameResult = filenameResult.slice(0, -7);
    }

    // 如果最后切除完名字变空了、或者是普通的“raw”标识字眼，则降级寻找路径中倒数第二段（通常是资源 ID）
    if (!filenameResult || filenameResult.toLowerCase() === 'raw') {
        const pathSegments = decodeTarget.split('/').filter(s => s && s.toLowerCase() !== 'raw');
        if (pathSegments.length > 0) {
            filenameResult = pathSegments[pathSegments.length - 1];
        }
    }

    // 若各项指标匹配成功，则作为最终变量导出，不再输出 UnknownBinary.bin
    return filenameResult || matchedMeta.fallbackName;
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

        if (cleanPath === '/favicon.ico' || cleanPath === '/apple-touch-icon.png' || 
            cleanPath === '/apple-touch-icon-precomposed.png' || cleanPath === '/site.webmanifest' || 
            cleanPath === '/browserconfig.xml' || cleanPath.includes('android-chrome-')) {
            return new Response(null, { status: 204 });
        }

        if (url.pathname === '/' + pAdmin || url.pathname === '/' + pAdmin + '/') {
            return new Response(getPanelHTML(), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }

        // Base64 隐身中转生成路由 (/hid/)
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

        // 传统简短外显路由中转层 (/sho/)
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

        // 精炼中转站路由调度层 (/ref/)
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

        // 路由解析与映射逻辑
        let isShortAliasRoute = false;
        let matchedAliasConfig = null;
        let activePathname = url.pathname;

        // 1. 解码隐身路径 (/dcb/)
        if (url.pathname.startsWith('/' + pDcb + '/')) {
            const rawPart = url.pathname.substring(pDcb.length + 2); 
            const firstSlashIndex = rawPart.indexOf('/');
            const base64UrlParam = firstSlashIndex !== -1 ? rawPart.substring(0, firstSlashIndex) : rawPart;

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
                        activePathname = `/${sName}/${siteId}`;
                    }
                }
            } catch (e) {
                return new Response("Invalid Hidden Base64 Payload Structure", { status: 400 });
            }
        }

        // 2. 转换传统缩写别名路由
        if (!isShortAliasRoute) {
            for (const site of REFINING_REGISTRY) {
                if (url.pathname.startsWith('/' + site.shortName + '/')) {
                    isShortAliasRoute = true;
                    matchedAliasConfig = site;
                    
                    const rem = url.pathname.substring(site.shortName.length + 2);
                    const remSlash = rem.indexOf('/');
                    if (remSlash !== -1) {
                        activePathname = `/${site.shortName}/${rem.substring(0, remSlash)}`;
                    }
                    break;
                }
            }
        }

        // 重写映射为底层反代直链路径
        if (isShortAliasRoute && matchedAliasConfig) {
            const remainingPart = activePathname.substring(matchedAliasConfig.shortName.length + 2);
            const rawUrlPrefix = matchedAliasConfig.ref_URL.replace('://', '/');
            activePathname = '/' + pShare + '/' + rawUrlPrefix + remainingPart;
        }

        if (!activePathname.startsWith('/' + pShare + '/')) {
            return new Response("Forbidden: Access Denied", { status: 403 });
        }

        // 判定外显路径中是否带有用于欺骗浏览器直显的虚拟后缀并裁切
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

        // 命中全局缓存管理下发
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

        // 魔数流式断点读取嗅探器
        const previewStream = upstream.clone();
        const reader = previewStream.body.getReader();
        const { value } = await reader.read(); 
        
        const chunkText = new TextDecoder().decode(value).trim().substring(0, 30);
        const cleanChunk = chunkText.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');

        let matchedMeta = MAGIC_REGISTRY.find(item => item.b64_prefix && cleanChunk.startsWith(item.b64_prefix));
        if (!matchedMeta) {
            matchedMeta = MAGIC_REGISTRY[MAGIC_REGISTRY.length - 1]; 
        }

        // 🚀 调用全局统一决策引擎推导最终输出文件名
        const OUTPUT_FILENAME = determineOutputFile(matchedMeta, url.pathname);

        // 资产输出分发控制层
        if (matchedMeta.isImage) {
            // 如果既不是隐式欺骗后缀路由，客户端又没有明确带图片的静态后缀，执行跳转以保证直显
            const isImageStaticExt = url.pathname.toLowerCase().endsWith('.' + matchedMeta.ext);
            if (!hasVirtualImageSuffix && !isImageStaticExt) {
                const redirectUrl = new URL(request.url);
                redirectUrl.pathname = redirectUrl.pathname.replace(/[\/]+$/, '') + '/image.' + matchedMeta.ext;
                return Response.redirect(redirectUrl.toString(), 302);
            }

            const fullBase64Text = await upstream.text();
            try {
                const finalBuffer = decodeBase64(fullBase64Text, CONFIG.BACKEND_MAX_SIZE_KB * 1024);
                const respHeaders = new Headers({
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": matchedMeta.mime,
                    "Content-Disposition": `inline; filename="${OUTPUT_FILENAME}"`,
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
            // 通用二进制流，交由格式化后的前端沙盒解码降级落地
            if (CONFIG.ALLOW_FALLBACK_DOWNLOAD !== 1) {
                return new Response("Forbidden: Not a valid image Base64 stream.", { status: 403 });
            }

            const fullText = await upstream.text();
            return new Response(getFallbackDecoderHTML(fullText, OUTPUT_FILENAME), {
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
 * 渲染前端管理面板 UI（已格式化展开，可读性极佳）
 */
function getPanelHTML() {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CDN 极简中转站</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
        body {
            font-family: sans-serif;
            background: #f4f6f9;
            color: #333;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .box {
            width: 100%;
            max-width: 650px;
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-top: 40px;
        }
        input[type="text"] {
            width: 100%;
            padding: 14px;
            font-size: 14px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
            margin-bottom: 15px;
            outline: none;
        }
        input[type="text"]:focus {
            border-color: #409eff;
        }
        .btn-row {
            display: flex;
            gap: 12px;
        }
        .btn {
            flex: 1;
            padding: 14px;
            font-size: 14px;
            color: #fff;
            background: #409eff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            text-align: center;
            box-sizing: border-box;
        }
        .btn:hover {
            background: #66b1ff;
        }
        .btn-green {
            background: #67c23a;
        }
        .btn-green:hover {
            background: #85ce61;
        }
        .progress-wrapper {
            width: 100%;
            background: #ebeef5;
            border-radius: 10px;
            margin-top: 15px;
            display: none;
            overflow: hidden;
            position: relative;
            height: 18px;
        }
        .progress-bar {
            height: 100%;
            width: 0%;
            background: #67c23a;
            transition: width 0.1s ease;
        }
        .progress-text {
            position: absolute;
            width: 100%;
            text-align: center;
            font-size: 11px;
            font-weight: bold;
            color: #333;
            line-height: 18px;
        }
    </style>
</head>
<body>
    <div class="box">
        <h3 style="margin:0 0 15px 0;text-align:center;color:#222">CDN 极简中转控制面板</h3>
        <input type="text" id="urlInput" placeholder="直接粘贴各种完整的 RAW URL...">
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

        document.getElementById('btnPick').onclick = function() {
            document.getElementById('fileFile').click();
        };

        document.getElementById('fileFile').onchange = function() {
            if(this.files.length === 0) return;
            const file = this.files[0];
            if(file.size > FRONTEND_MAX_SIZE_KB * 1024) {
                alert("文件大小超过前端限制.");
                this.value = "";
                return;
            }
            
            const wrapper = document.getElementById('progressWrapper');
            const bar = document.getElementById('progressBar');
            const txt = document.getElementById('progressText');
            
            wrapper.style.display = 'block';
            bar.style.width = '0%';
            txt.textContent = "正在初始化流读取器...";
            
            const chunkSize = 1024 * 256;
            let offset = 0;
            let binaryString = "";

            const readChunk = () => {
                const reader = new FileReader();
                const blob = file.slice(offset, offset + chunkSize);
                reader.onload = function(e) {
                    const bytes = new Uint8Array(e.target.result);
                    let chunkStr = "";
                    for(let i=0; i<bytes.length; i++) {
                        chunkStr += String.fromCharCode(bytes[i]);
                    }
                    binaryString += chunkStr;
                    offset += chunkSize;
                    
                    let percent = Math.min(100, Math.floor((offset / file.size) * 100));
                    bar.style.width = percent + '%';
                    txt.textContent = "正在编码数据流: " + percent + "%";
                    
                    if (offset < file.size) { 
                        setTimeout(readChunk, 1); 
                    } else {
                        txt.textContent = "正在执行最终打包与哈希映射...";
                        setTimeout(() => {
                            try {
                                const base64Result = btoa(binaryString);
                                const blobOut = new Blob([base64Result], { type: "text/plain;charset=utf-8" });
                                const dlUrl = URL.createObjectURL(blobOut);
                                const a = document.createElement('a');
                                a.href = dlUrl;
                                a.download = file.name + ".b64";
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(dlUrl);
                                txt.textContent = "编码并导出成功！";
                            } catch(err) {
                                txt.textContent = "发生致命溢出异常。";
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
</body>
</html>`;
}

/**
 * 渲染前端流式分块本地二进制文件恢复及沙盒自动下载落地 HTML（已格式化展开）
 */
function getFallbackDecoderHTML(rawPayload, cleanFileName) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>正在落地资产...</title>
    <style>
        body {
            font-family: sans-serif;
            background: #f4f6f9;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .card {
            background: #fff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            text-align: center;
            width: 100%;
            max-width: 440px;
            box-sizing: border-box;
        }
        .progress-wrapper {
            width: 100%;
            background: #ebeef5;
            border-radius: 10px;
            margin-top: 20px;
            overflow: hidden;
            position: relative;
            height: 18px;
        }
        .progress-bar {
            height: 100%;
            width: 0%;
            background: #e6a23c;
            transition: width 0.1s ease;
        }
        .progress-text {
            position: absolute;
            width: 100%;
            left: 0;
            top: 0;
            text-align: center;
            font-size: 11px;
            font-weight: bold;
            color: #333;
            line-height: 18px;
        }
    </style>
</head>
<body>
    <div class="card">
        <h3 id="statusTitle" style="margin:0 0 10px 0;color:#e6a23c">正在落地通用数据流</h3>
        <p style="font-size:13px;color:#333;font-weight:bold;word-break:break-all;margin-bottom:8px">正在还原：${cleanFileName}</p>
        <p style="font-size:12px;color:#666;line-height:1.5;margin:0">系统正在分块解码并还原物理二进制结构...</p>
        <div class="progress-wrapper">
            <div class="progress-bar" id="progressBar"></div>
            <div class="progress-text" id="progressText">准备解码... 0%</div>
        </div>
    </div>
    <script>
        (function(){
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
                            for (let i = 0; i < len; i++) { 
                                bytes[i] = binaryStr.charCodeAt(i); 
                            }
                            
                            const blob = new Blob([bytes.buffer], { type: "application/octet-stream" });
                            const dlUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = dlUrl; 
                            a.download = "${cleanFileName}";
                            document.body.appendChild(a);
                            a.click();
                            
                            setTimeout(() => {
                                document.body.removeChild(a); 
                                URL.revokeObjectURL(dlUrl);
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
            }
        })();
    </script>
</body>
</html>`;
}