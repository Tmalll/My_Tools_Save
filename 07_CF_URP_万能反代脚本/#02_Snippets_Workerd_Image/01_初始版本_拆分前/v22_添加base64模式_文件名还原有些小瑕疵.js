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
    // 超简短模式前缀 (Short缩写中转)
    ShortName_PREFIX: '/sho',              
    // 新增：Base64隐身模式中转前缀 (hide缩写)
    hide64_PREFIX: '/hid',                 
    // 新增：Base64隐身路径输出别名 (de code base64 缩写)
    DECODE_B64_PREFIX: '/dcb',             
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
        ref_URL: "https://gist.githubusercontent.com/raw/",
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
            // 8. usercontent 仅有用户名和ID，无末尾raw的链接
            { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})/i },
            // 9. 只有匿名 ID 的原生 short 链接
            { regex: /gist\.githubusercontent\.com\/([0-9a-f]{32})\/raw/i },
            // 10. 已经是标准精炼格式的链接
            { regex: /gist\.githubusercontent\.com\/raw\/([0-9a-f]{32})/i }
        ],
        toRaw: (id) => `https://gist.githubusercontent.com/raw/${id}`
    },
    {
        name: "PASTEBIN",
        shortName: "pas",
        ref_URL: "https://pastebin.com/raw/",
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
 * 升级版核心精炼处理器：匹配成功同时吐出完整 raw URL、配置、和摘取的 ID
 */
function tryRefiningUrlEx(urlStr) {
    if (!urlStr) return null;
    for (const site of REFINING_REGISTRY) {
        for (const item of site.match_group) {
            const match = urlStr.match(item.regex);
            if (match && match[1]) {
                return {
                    id: match[1],
                    siteConfig: site,
                    refinedUrlStr: site.toRaw(match[1])
                };
            }
        }
    }
    return null;
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
        const pSho   = CONFIG.ShortName_PREFIX.replace(/^\/+|\/+$/g, '');
        const pHid   = CONFIG.hide64_PREFIX.replace(/^\/+|\/+$/g, '');
        const pDcb   = CONFIG.DECODE_B64_PREFIX.replace(/^\/+|\/+$/g, '');
        const cleanPath = url.pathname.toLowerCase();

        // 1. 浏览器元数据快速熔断处理
        if (cleanPath === '/favicon.ico' || cleanPath === '/apple-touch-icon.png' || 
            cleanPath === '/apple-touch-icon-precomposed.png' || cleanPath === '/site.webmanifest' || 
            cleanPath === '/browserconfig.xml' || cleanPath.includes('android-chrome-')) {
            return new Response(null, { status: 204 });
        }

        // 2. 拦截并分发管理控制面板页面
        if (url.pathname === '/' + pAdmin || url.pathname === '/' + pAdmin + '/') {
            return new Response(getPanelHTML(), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }

        // 3. 【全新特化路由】：新增 Base64 隐身模式中转路由 (/hid/)
        if (url.pathname.startsWith('/' + pHid + '/')) {
            let targetPath = url.pathname.substring(pHid.length + 2);
            let rawTargetUrl = parseTargetUrl(targetPath + url.search + url.hash);
            if (!rawTargetUrl) return new Response("Invalid Target URL for Hide Mode", { status: 400 });

            const res = tryRefiningUrlEx(rawTargetUrl.toString());
            if (res) {
                // 提取需要的短名变量和ID并组合，如 "gis/4ca9950d388..."
                const pathString = `${res.siteConfig.shortName}/${res.id}`;
                // 将组合字符串整体进行标准 Base64 编码，转成安全网络格式
                const encodedPart = btoa(pathString).replace(/=/g, ''); 
                // 拼接并重定向至 dcb 路径：/dcb/${Base64_URL}/image.png
                const finalHideUrl = `${url.origin}/${pDcb}/${encodedPart}/image.png`;
                return Response.redirect(finalHideUrl, 302);
            } else {
                // 如果没有匹配到任何规则，退回到普通 dis 路由
                let cleanUrlPart = rawTargetUrl.toString();
                if (/^https?:\/\//i.test(cleanUrlPart)) {
                    cleanUrlPart = cleanUrlPart.replace(/^https?:\/\//i, function(m) { return m.toLowerCase().replace('://', '/'); });
                }
                return Response.redirect(`${url.origin}/${pShare}/${cleanUrlPart}`, 302);
            }
        }

        // 4. 【超简短路由中转层】：如果是 /sho/ 模式，保持原有逻辑稳定运行
        if (url.pathname.startsWith('/' + pSho + '/')) {
            let targetPath = url.pathname.substring(pSho.length + 2);
            let rawTargetUrl = parseTargetUrl(targetPath + url.search + url.hash);
            if (!rawTargetUrl) return new Response("Invalid Target URL for Short Mode", { status: 400 });

            const res = tryRefiningUrlEx(rawTargetUrl.toString());
            if (res) {
                const finalShortUrl = `${url.origin}/${res.siteConfig.shortName}/${res.id}/image.png`;
                return Response.redirect(finalShortUrl, 302);
            } else {
                let cleanUrlPart = rawTargetUrl.toString();
                if (/^https?:\/\//i.test(cleanUrlPart)) {
                    cleanUrlPart = cleanUrlPart.replace(/^https?:\/\//i, function(m) { return m.toLowerCase().replace('://', '/'); });
                }
                return Response.redirect(`${url.origin}/${pShare}/${cleanUrlPart}`, 302);
            }
        }

        // 5. 【精炼中转站路由】：如果是 /ref/ 模式，保持原有逻辑稳定运行
        if (url.pathname.startsWith('/' + pRef + '/')) {
            let targetPath = url.pathname.substring(pRef.length + 2);
            let rawTargetUrl = parseTargetUrl(targetPath + url.search + url.hash);
            if (!rawTargetUrl) return new Response("Invalid Target URL for Refining", { status: 400 });

            const res = tryRefiningUrlEx(rawTargetUrl.toString());
            let cleanUrlPart = res ? res.refinedUrlStr : rawTargetUrl.toString();
            
            if (/^https?:\/\//i.test(cleanUrlPart)) {
                cleanUrlPart = cleanUrlPart.replace(/^https?:\/\//i, function(m) { return m.toLowerCase().replace('://', '/'); });
            }
            return Response.redirect(url.origin + '/' + pShare + '/' + cleanUrlPart, 302);
        }

        // 6. 【别名路由映射器】：无缝支持 /gis/ , /pas/ 以及全新的 Base64 隐身映射 /dcb/
        let isShortAliasRoute = false;
        let matchedAliasConfig = null;
        let activePathname = url.pathname;

        // A. 拦截并处理特殊的 Base64 解码隐身路径 (/dcb/)
        if (url.pathname.startsWith('/' + pDcb + '/')) {
            const rawPart = url.pathname.substring(pDcb.length + 2); // 除去开头的 /dcb/
            const firstSlashIndex = rawPart.indexOf('/');
            // 拆出 Base64 核心参数
            const base64UrlParam = firstSlashIndex !== -1 ? rawPart.substring(0, firstSlashIndex) : rawPart;
            // 拆出可能存在的文件名后缀残余部分 (如 /image.png)
            const remainingSuffix = firstSlashIndex !== -1 ? rawPart.substring(firstSlashIndex) : '';

            try {
                // 在内存中解码还原出原本路径形式，例如 "gis/4ca9950d388a6fd5c6b4472bac2bed41"
                let decodedStr = atob(base64UrlParam).trim();
                const firstPartIndex = decodedStr.indexOf('/');
                if (firstPartIndex !== -1) {
                    const sName = decodedStr.substring(0, firstPartIndex);
                    const siteId = decodedStr.substring(firstPartIndex + 1);
                    // 动态查找对应的站点参数配置
                    const targetSite = REFINING_REGISTRY.find(s => s.shortName === sName);
                    if (targetSite) {
                        isShortAliasRoute = true;
                        matchedAliasConfig = targetSite;
                        // 隐式重组出完全等价的标准相对子地址：/${shortName}/${id}${remainingSuffix}
                        activePathname = `/${sName}/${siteId}${remainingSuffix}`;
                    }
                }
            } catch (e) {
                return new Response("Invalid Hidden Base64 Payload Structure", { status: 400 });
            }
        }

        // B. 原有普通的 /gis/ 和 /pas/ 线性别名检测
        if (!isShortAliasRoute) {
            for (const site of REFINING_REGISTRY) {
                if (url.pathname.startsWith('/' + site.shortName + '/')) {
                    isShortAliasRoute = true;
                    matchedAliasConfig = site;
                    break;
                }
            }
        }

        // 最终在这里统一将所有别名隐式映射进底层的 /dis/ 原生逻辑中
        if (isShortAliasRoute && matchedAliasConfig) {
            const remainingPart = activePathname.substring(matchedAliasConfig.shortName.length + 2);
            const rawUrlPrefix = matchedAliasConfig.ref_URL.replace('://', '/');
            activePathname = '/' + pShare + '/' + rawUrlPrefix + remainingPart;
        }

        // 7. 安全前缀路由鉴权校验 (兼容原生 dis 与各类高阶映射别名)
        if (!activePathname.startsWith('/' + pShare + '/')) {
            return new Response("Forbidden: Access Denied", { status: 403 });
        }

        // 下面完全恢复为 v18 原生逻辑，改用经别名重写映射过的 activePathname 解析路径与文件名
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

        // 8. 边缘高速缓存拦截读取
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) return cachedResponse;
        }

        // 9. 对目标源站发起高速拉取
        const fetchHeaders = new Headers();
        const userUA = request.headers.get('User-Agent');
        fetchHeaders.set('User-Agent', userUA || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36');

        let upstream = await fetch(targetUrl, { method: 'GET', headers: fetchHeaders, redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: ${upstream.status}`, { status: upstream.status });

        const contentLength = upstream.headers.get("Content-Length");
        if (!contentLength && CONFIG.ALLOW_BACKEND_CHUNKED_RAW !== 1) {
            return new Response("Forbidden: Streaming without Content-Length is rejected by CONFIG.", { status: 403 });
        }

        // 10. 流式复用前置预检
        const previewStream = upstream.clone();
        const reader = previewStream.body.getReader();
        const { value } = await reader.read(); 
        
        const chunkText = new TextDecoder().decode(value).trim().substring(0, 30);
        const cleanChunk = chunkText.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');

        // 11. 自动化检索注册表，建立格式哈希映射
        let matchedMeta = MAGIC_REGISTRY.find(item => item.prefix && cleanChunk.startsWith(item.prefix));
        if (!matchedMeta) {
            matchedMeta = MAGIC_REGISTRY[MAGIC_REGISTRY.length - 1]; 
        }

        // 12. 多态场景终极分流执行中心
        if (matchedMeta.isImage) {
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
            // 二进制模式处理 (完美保留原本行为)
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

// 供底层使用的核心 Base64 解码器
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
// 🖥️ HTML：控制面板 (完好保留原版)
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