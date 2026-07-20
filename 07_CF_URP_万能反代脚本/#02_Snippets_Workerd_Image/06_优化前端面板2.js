// CF_Workers_万能图片反代脚本 (硬核魔数 + 架构精炼优化版)

// 模块1：全局核心参数配置
const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD',
    SHARE_PREFIX: '/dis',
    REFINING_PREFIX: '/ref',
    REFINING_OUT_PREFIX: '/simp', 
    ShortName_PREFIX: '/sho',
    hide64_PREFIX: '/hid',
    DECODE_B64_PREFIX: '/dcb',
    UHM_PREFIX_1: '/uhm1', UHM_OUTPUT_1: '/uem1',
    UHM_PREFIX_2: '/uhm2', UHM_OUTPUT_2: '/uem2',
    UHM_PREFIX_3: '/uhm3', UHM_OUTPUT_3: '/uem3',
    STEALTH_KEY: 'Tmalll_Secret_Salt_2026',
    DEBUG_MODE: 1,
    CACHE_TTL: 2592000,
    BACKEND_MAX_SIZE_KB: 10240,     // 后端请求大小限制(KB)
    ALLOW_BACKEND_CHUNKED_RAW: 1,   // 允许无长度后端文件
    FRONTEND_MAX_SIZE_KB: 15360     // 前端编码大小限制(KB)
};

// 模块2：魔数映射注册表 (Base64 文本图片探测)
const B64_MAGIC_REGISTRY = [
    { b64_prefix: "iVBORw", mime: "image/png",     ext: "png"  },
    { b64_prefix: "/9j/",   mime: "image/jpeg",    ext: "jpg"  },
    { b64_prefix: "R0lGOD", mime: "image/gif",     ext: "gif"  },
    { b64_prefix: "UklGR",  mime: "image/webp",    ext: "webp" },
    { b64_prefix: "AAAAIG", mime: "image/avif",    ext: "avif" },
    { b64_prefix: "PHN2Zy", mime: "image/svg+xml", ext: "svg"  },
    { b64_prefix: "AAABAA", mime: "image/x-icon",  ext: "ico"  },
    { b64_prefix: "Qk0",    mime: "image/bmp",     ext: "bmp"  }
];

// 模块3：原始二进制图片魔数白名单 (流式前置硬核字节校验)
const RAW_MAGIC_REGISTRY = [
    { mime: "image/png",      ext: "png",  bytes: [0x89, 0x50, 0x4E, 0x47] },
    { mime: "image/jpeg",     ext: "jpg",  bytes: [0xFF, 0xD8, 0xFF] },
    { mime: "image/gif",      ext: "gif",  bytes: [0x47, 0x49, 0x46, 0x38] },
    { mime: "image/webp",     ext: "webp", bytes: [0x52, 0x49, 0x46, 0x46] },
    { mime: "image/x-icon",   ext: "ico",  bytes: [0x00, 0x00, 0x01, 0x00] },
    { mime: "image/bmp",      ext: "bmp",  bytes: [0x42, 0x4D] },
    { mime: "image/svg+xml",  ext: "svg",  bytes: [0x3C, 0x3F, 0x78, 0x6D] },
    { mime: "image/svg+xml",  ext: "svg",  bytes: [0x3C, 0x73, 0x76, 0x67] }
];

const RAW_IMAGE_MIME_WHITELIST = [
    "image/jpeg", "image/png", "image/webp", "image/gif", 
    "image/avif", "image/svg+xml", "image/x-icon", "image/bmp"
];

function deepDecode(str) {
    let current = str;
    try {
        while (current.includes('%')) {
            let next = decodeURIComponent(current);
            if (next === current) break;
            current = next;
        }
    } catch { }
    return current;
}

function parseRefRegistry(urlStr) {
    if (!urlStr) return null;
    let cleanUrl = urlStr.trim();
    for (const site of REFINING_REGISTRY) {
        for (const item of site.match_group) {
            const match = cleanUrl.match(item.regex);
            if (match && match[1]) {
                return { site: site, ID: match[1], ref_URL: site.toRaw(match[1]), shortName: site.shortName, aliasPrefix: site.aliasPrefix };
            }
        }
    }
    return null;
}

const REFINING_REGISTRY = [
    {
        name: "GIST", shortName: "gis", aliasPrefix: "/gis", ref_URL: "https://gist.githubusercontent.com/raw/",
        match_group: [
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/[0-9a-f]{40}\/([^\/\?#]+)/i },
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/([^\/\?#]+)/i },
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})\/raw/i },
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})/i },
            { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/[0-9a-f]{40}\/([^\/\?#]+)/i },
            { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/([^\/\?#]+)/i },
            { regex: /gist\.githubusercontent\.com\/raw\/([0-9a-f]{32})\/([^\/\?#]+)/i },
            { regex: /gist\.githubusercontent\.com\/raw\/([0-9a-f]{32})/i }
        ],
        toRaw: (id) => `https://gist.githubusercontent.com/raw/${id}`
    },
    {
        name: "PASTEBIN", shortName: "pas", aliasPrefix: "/pas", ref_URL: "https://pastebin.com/raw/",
        match_group: [
            { regex: /pastebin\.com\/raw\/([a-zA-Z0-9]{8})/i },
            { regex: /pastebin\.com\/([a-zA-Z0-9]{8})/i }
        ],
        toRaw: (id) => `https://pastebin.com/raw/${id}`
    }
];

function parseBinaryName(urlStr) {
    if (!urlStr) return "";
    let cleanUrl = urlStr.trim().replace(/\/+$/, '');
    if (/\/(image\.[a-z0-9]+)$/i.test(cleanUrl)) {
        cleanUrl = cleanUrl.substring(0, cleanUrl.lastIndexOf('/'));
    }
    let lastSlashIdx = cleanUrl.lastIndexOf('/');
    let name = lastSlashIdx === -1 ? cleanUrl : cleanUrl.substring(lastSlashIdx + 1);
    name = deepDecode(name.replace(/[\?#].*$/, ''));
    let registryResult = parseRefRegistry(urlStr);
    if (registryResult && registryResult.ID && name === registryResult.ID) return "";
    return name;
}

function makeFullUrlPart(urlStr, pShare) {
    let c = urlStr.trim();
    if (/^https?:\/\//i.test(c)) {
        c = c.replace(/^https?:\/\//i, m => m.toLowerCase().replace('://', '/'));
    } else if (!/^https?\//i.test(c)) {
        c = 'https/' + c;
    }
    return `${pShare}/${c}`;
}

async function getStealthCryptoContext(seed) {
    const enc = new TextEncoder(), hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(seed)), hashArray = new Uint8Array(hashBuffer);
    return { key: await crypto.subtle.importKey('raw', hashArray.subarray(0, 16), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']), iv: hashArray.subarray(16, 28) };
}
function bytesToBase64Url(arr) { return btoa(String.fromCharCode(...new Uint8Array(arr))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }
function base64UrlToBytes(s) {
    const cleanS = s.replace(/-/g, '+').replace(/_/g, '/'), pad = (4 - (cleanS.length % 4)) % 4;
    const rawStr = atob(cleanS + "=".repeat(pad)), arr = new Uint8Array(rawStr.length);
    for (let i = 0; i < rawStr.length; i++) arr[i] = rawStr.charCodeAt(i);
    return arr.buffer;
}
async function encryptStealthText(plainText, seed, mode = 1) {
    let srcBytes = new TextEncoder().encode(plainText);
    if (mode === 3) {
        const cs = new CompressionStream('deflate'), writer = cs.writable.getWriter();
        writer.write(srcBytes); writer.close();
        srcBytes = new Uint8Array(await new Response(cs.readable).arrayBuffer());
    }
    const ctx = await getStealthCryptoContext(seed);
    const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ctx.iv }, ctx.key, srcBytes);
    if (mode === 2) return Array.from(new Uint8Array(encryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return bytesToBase64Url(encryptedBuffer);
}
async function decryptStealthText(cipherText, seed, mode = 1) {
    try {
        let cipherBytes = (mode === 2) ? new Uint8Array(cipherText.match(/.{1,2}/g).map(byte => parseInt(byte, 16))).buffer : base64UrlToBytes(cipherText);
        const ctx = await getStealthCryptoContext(seed);
        let decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ctx.iv }, ctx.key, cipherBytes);
        if (mode === 3) {
            const ds = new DecompressionStream('deflate'), writer = ds.writable.getWriter();
            writer.write(new Uint8Array(decryptedBuffer)); writer.close();
            decryptedBuffer = await new Response(ds.readable).arrayBuffer();
        }
        return new TextDecoder().decode(decryptedBuffer);
    } catch { return null; }
}

export default {
    async fetch(request, env, ctx) {
        const realProto = request.headers.get("x-real-scheme"), realHost = request.headers.get("x-real-host");
        if (realProto && realHost) {
            const u = new URL(request.url);
            request = new Request(`${realProto}://${realHost}${u.pathname}${u.search}${u.hash}`, { method: request.method, headers: request.headers, body: request.method === "GET" || request.method === "HEAD" ? null : request.body, redirect: "manual" });
        }
        const url = new URL(request.url), 
              pAdmin = CONFIG.AUTH_PREFIX.replace(/^\/|\/$/g, ''), 
              pShare = CONFIG.SHARE_PREFIX.replace(/^\/|\/$/g, ''), 
              pRef = CONFIG.REFINING_PREFIX.replace(/^\/|\/$/g, ''), 
              pSimp = CONFIG.REFINING_OUT_PREFIX.replace(/^\/|\/$/g, ''), 
              pSho = CONFIG.ShortName_PREFIX.replace(/^\/|\/$/g, ''), 
              pHid = CONFIG.hide64_PREFIX.replace(/^\/|\/$/g, ''), 
              pDcb = CONFIG.DECODE_B64_PREFIX.replace(/^\/|\/$/g, ''), 
              pUhm = [CONFIG.UHM_PREFIX_1, CONFIG.UHM_PREFIX_2, CONFIG.UHM_PREFIX_3].map(p => p.replace(/^\/|\/$/g, '')),
              pUem = [CONFIG.UHM_OUTPUT_1, CONFIG.UHM_OUTPUT_2, CONFIG.UHM_OUTPUT_3].map(p => p.replace(/^\/|\/$/g, ''));

        if (['/favicon.ico', '/apple-touch-icon.png', '/site.webmanifest'].some(p => url.pathname.toLowerCase().startsWith(p))) return new Response(null, { status: 204 });
        if (url.pathname === '/' + pAdmin || url.pathname === '/' + pAdmin + '/') return new Response(getPanelHTML(), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

        // =================【/ref 模式独立分出处理】=================
        if (url.pathname.startsWith('/' + pRef + '/')) {
            let remain = url.pathname.substring(pRef.length + 2) + url.search + url.hash;
            let fullUrl = remain.replace(/^https?[:\/]+/i, 'https://').replace('http/', 'http://');
            let binaryName = parseBinaryName(fullUrl);
            let registryResult = parseRefRegistry(fullUrl);
            if (registryResult) {
                let tail = binaryName ? `/${encodeURIComponent(binaryName)}` : '';
                return Response.redirect(`${url.origin}/${pSimp}/${registryResult.ref_URL.replace('://', '/')}${tail}`, 302);
            }
            return Response.redirect(`${url.origin}/${makeFullUrlPart(fullUrl, pShare)}`, 302);
        }

        // =================【/sho 模式独立运行】=================
        if (url.pathname.startsWith('/' + pSho + '/')) {
            let remain = url.pathname.substring(pSho.length + 2) + url.search + url.hash;
            let fullUrl = remain.replace(/^https?[:\/]+/i, 'https://').replace('http/', 'http://');
            let binaryName = parseBinaryName(fullUrl);
            let registryResult = parseRefRegistry(fullUrl);
            
            if (registryResult) {
                let tail = binaryName ? `/${encodeURIComponent(binaryName)}` : '';
                return Response.redirect(`${url.origin}${registryResult.aliasPrefix}/${registryResult.ID}${tail}`, 302);
            }
            let cleanId = remain.split('/')[0];
            if (/^[0-9a-f]{32}$/i.test(cleanId)) {
                return Response.redirect(`${url.origin}/gis/${remain}`, 302);
            } else if (/^[a-zA-Z0-9]{8}$/.test(cleanId)) {
                return Response.redirect(`${url.origin}/pas/${remain}`, 302);
            }
            return Response.redirect(`${url.origin}/${makeFullUrlPart(fullUrl, pShare)}`, 302);
        }

        // =================【/hid 与 /uhm1.2.3 机制：直接加密 /dis 完整链接】=================
        let cryptoMode = -1, cryptoPrefix = "";
        if (url.pathname.startsWith('/' + pHid + '/')) { cryptoMode = 0; cryptoPrefix = pHid; }
        else {
            const idx = pUhm.findIndex(p => url.pathname.startsWith('/' + p + '/'));
            if (idx !== -1) { cryptoMode = idx + 1; cryptoPrefix = pUhm[idx]; }
        }

        if (cryptoMode >= 0) {
            let remain = url.pathname.substring(cryptoPrefix.length + 2) + url.search + url.hash;
            let fullUrl = remain.replace(/^https?[:\/]+/i, 'https://').replace('http/', 'http://');
            let binaryName = parseBinaryName(fullUrl);
            
            // 严格对标：直接获取并封装完整的 /dis 路由链接，不进行任何中间推导
            let routingPayload = makeFullUrlPart(fullUrl, pShare); // 输出样例: /dis/https/raw.githubusercontent...

            // 使用 URL 安全的 Base64 字符转换，避免特殊斜杠字符产生混淆
            let encryptedPayload = btoa(routingPayload).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
            if (cryptoMode > 0) encryptedPayload = await encryptStealthText(encryptedPayload, CONFIG.STEALTH_KEY, cryptoMode);

            let outPrefix = (cryptoMode === 0) ? pDcb : pUem[cryptoMode - 1];
            let tail = binaryName ? `/${encodeURIComponent(binaryName)}` : '';
            return Response.redirect(`${url.origin}/${outPrefix}/${encryptedPayload}${tail}`, 302);
        }

        // =================【核心解密/别名还原落地】=================
        let workingPath = url.pathname;
        let uemIdx = pUem.findIndex(p => url.pathname.startsWith('/' + p + '/'));
        
        if (uemIdx !== -1 || url.pathname.startsWith('/' + pDcb + '/')) {
            const isDcb = url.pathname.startsWith('/' + pDcb + '/');
            const prefix = isDcb ? pDcb : pUem[uemIdx];
            let rawPart = url.pathname.substring(prefix.length + 2);
            let cryptPart = rawPart.split('/')[0];
            
            let decryptedB64 = isDcb ? cryptPart : await decryptStealthText(cryptPart, CONFIG.STEALTH_KEY, uemIdx + 1);
            if (!decryptedB64) return new Response("Forbidden: Invalid Crypto Stream", { status: 403 });
            
            try { 
                // 还原 URL 安全的 Base64 格式
                let cleanB64 = decryptedB64.replace(/-/g, '+').replace(/_/g, '/');
                let mod = cleanB64.length % 4; if (mod > 0) cleanB64 += "=".repeat(4 - mod);
                
                workingPath = atob(cleanB64).trim(); 
                // 核心修复：确保解密出的原始相对路径以斜杠开头，完美对应 /dis/... 校验
                if (!workingPath.startsWith('/')) workingPath = '/' + workingPath;
            } catch { 
                return new Response("Forbidden: Corrupted Payload", { status: 403 }); 
            }
        }

        // 别名还原支持
        let activeAlias = REFINING_REGISTRY.find(site => workingPath.startsWith(site.aliasPrefix + '/'));
        if (activeAlias) {
            let targetID = workingPath.substring(activeAlias.aliasPrefix.length + 1).split('/')[0];
            workingPath = '/' + pShare + '/' + activeAlias.ref_URL.replace('://', '/') + targetID;
        }
        if (workingPath.startsWith('/' + pSimp + '/')) workingPath = '/' + pShare + workingPath.substring(pSimp.length + 1);
        
        // 校验是否属于合法 /dis 服务
        if (!workingPath.startsWith('/' + pShare + '/')) return new Response("Forbidden: Access Denied", { status: 403 });

        let isNativeDisMode = url.pathname.startsWith('/' + pShare + '/');
        if (isNativeDisMode && url.pathname.includes('://')) {
            let currentUrlPath = url.pathname.replace(/\/+$/, '');
            currentUrlPath = currentUrlPath.replace(/^https?:\/\/[^\/]+\/dis\//i, '').replace('://', '/');
            let cleanPath = `/${pShare}/${currentUrlPath}`.replace(/\/+/g, '/').replace(/^\/dis\/dis\//i, '/dis/');
            return Response.redirect(`${url.origin}${cleanPath}${url.search}${url.hash}`, 302);
        }

        let pureUpstreamPath = workingPath.substring(pShare.length + 2);
        if (/\/(image\.[a-z0-9]+)$/i.test(pureUpstreamPath)) pureUpstreamPath = pureUpstreamPath.substring(0, pureUpstreamPath.lastIndexOf('/'));
        if (!isNativeDisMode) {
            let parts = pureUpstreamPath.split('/');
            if (parts.length > 3 && (pureUpstreamPath.includes('gist.githubusercontent.com/raw') || pureUpstreamPath.includes('pastebin.com/raw'))) {
                pureUpstreamPath = parts.slice(0, 4).join('/');
            }
        }

        let upstreamUrl = null;
        try { upstreamUrl = new URL(pureUpstreamPath.replace(/^https?[:\/]+/i, 'https://')); } catch { return new Response("Invalid Upstream Target", { status: 400 }); }

        // 发起网络 Fetch
        const cache = caches.default, cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) { const cachedResponse = await cache.match(cacheKey); if (cachedResponse) return cachedResponse; }

        const fetchHeaders = new Headers();
        fetchHeaders.set('User-Agent', request.headers.get('User-Agent') || 'Mozilla/5.0');
        let upstream = await fetch(upstreamUrl, { method: 'GET', headers: fetchHeaders, redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: ${upstream.status}`, { status: upstream.status });

        // =================【双重底层硬核魔数校验与流透传逻辑】=================
        const upstreamContentType = upstream.headers.get("Content-Type") || "";
        const cleanMime = upstreamContentType.split(';')[0].trim().toLowerCase();

        if (RAW_IMAGE_MIME_WHITELIST.includes(cleanMime) || cleanMime === "application/octet-stream") {
            const reader = upstream.body.getReader();
            const { done, value } = await reader.read();
            if (done || !value) return new Response("Forbidden: Empty Stream", { status: 403 });

            let isRealImage = false;
            let detectedMime = cleanMime;

            for (const item of RAW_MAGIC_REGISTRY) {
                if (value.length >= item.bytes.length) {
                    if (item.bytes.every((b, i) => value[i] === b)) {
                        isRealImage = true;
                        detectedMime = item.mime;
                        break;
                    }
                }
            }
            if (!isRealImage && cleanMime === "image/avif") {
                const textChunk = new TextDecoder().decode(value.subarray(0, 30));
                if (textChunk.includes("ftypavif") || textChunk.includes("ftypavis")) isRealImage = true;
            }

            if (!isRealImage) return new Response("Forbidden: Non-image or corrupted stream assets blocked.", { status: 403 });

            // 无损流重建透传
            const remainderStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(value);
                    function push() {
                        reader.read().then(({ done, value }) => {
                            if (done) { controller.close(); return; }
                            controller.enqueue(value); push();
                        });
                    }
                    push();
                }
            });

            const respHeaders = new Headers(upstream.headers);
            respHeaders.set("Access-Control-Allow-Origin", "*");
            respHeaders.set("Content-Type", detectedMime);
            respHeaders.set("Cache-Control", CONFIG.DEBUG_MODE === 1 ? "no-store" : `public, max-age=${CONFIG.CACHE_TTL}`);
            const response = new Response(remainderStream, { status: 200, headers: respHeaders });
            if (CONFIG.DEBUG_MODE !== 1) ctx.waitUntil(cache.put(cacheKey, response.clone()));
            return response;
        }

        // Base64 纯文本图片探测
        const previewStream = upstream.clone(), b64Reader = previewStream.body.getReader(), chunkData = await b64Reader.read();
        if (!chunkData.value) return new Response("Forbidden: Empty Stream", { status: 403 });
        const chunkText = new TextDecoder().decode(chunkData.value).trim().substring(0, 30).replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
        let matchedMeta = B64_MAGIC_REGISTRY.find(item => item.b64_prefix && chunkText.startsWith(item.b64_prefix));

        if (!matchedMeta) return new Response("Forbidden: Non-image or unsupported assets blocked.", { status: 403 });

        let expectedTail = `image.${matchedMeta.ext}`;
        if (!url.pathname.toLowerCase().endsWith('/' + expectedTail)) {
            if (isNativeDisMode) {
                let currentUrlPath = url.pathname.replace(/\/+$/, '');
                let cleanPath = `/${pShare}/${currentUrlPath}`.replace(/\/+/g, '/').replace(/^\/dis\/dis\//i, '/dis/');
                return Response.redirect(`${url.origin}${cleanPath}/${expectedTail}`, 302);
            } else {
                let urlParts = request.url.replace(/\/+$/, '').split('/');
                let lastPart = urlParts[urlParts.length - 1];
                if (lastPart.toLowerCase().endsWith('.b64') || lastPart.toLowerCase().endsWith('.base64') || lastPart.toLowerCase().startsWith('image.')) { urlParts.pop(); }
                return Response.redirect(urlParts.join('/') + '/' + expectedTail, 302);
            }
        }

        try {
            let cleaned = (await upstream.text()).replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
            const mod = cleaned.length % 4; if (mod > 1) cleaned += "=".repeat(4 - mod);
            const binary = atob(cleaned), bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const respHeaders = new Headers({ "Access-Control-Allow-Origin": "*", "Content-Type": matchedMeta.mime, "Content-Disposition": `inline; filename="image.${matchedMeta.ext}"`, "Cache-Control": CONFIG.DEBUG_MODE === 1 ? "no-store" : `public, max-age=${CONFIG.CACHE_TTL}` });
            const response = new Response(bytes.buffer, { status: 200, headers: respHeaders });
            if (CONFIG.DEBUG_MODE !== 1) ctx.waitUntil(cache.put(cacheKey, response.clone()));
            return response;
        } catch (e) { return new Response(`Decoder Exception: ${e.message}`, { status: 500 }); }
    }
};

// 模块8：控制面板前端
function getPanelHTML() {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CDN 纯净图片中转站</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: sans-serif; background: #f4f6f9; color: #333; padding: 20px; display: flex; flex-direction: column; align-items: center; }
        .box { width: 100%; max-width: 650px; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-top: 40px; }
        h3 { margin-top: 0; color: #2c3e50; }
        input[type="text"] { width: 100%; padding: 14px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; margin-bottom: 15px; outline: none; }
        input[type="text"]:focus { border-color: #409eff; }
        .btn-row { display: flex; gap: 12px; margin-bottom: 15px; }
        .btn { flex: 1; padding: 14px; font-size: 14px; color: #fff; background: #409eff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; text-align: center; box-sizing: border-box; }
        .btn:hover { background: #66b1ff; }
        .btn-green { background: #67c23a; }
        .btn-green:hover { background: #85ce61; }
        .btn-purple { background: #8e44ad; }
        .btn-purple:hover { background: #9b59b6; }
        .result-box { background: #f8f9fa; border: 1px dashed #dcdfe6; border-radius: 4px; padding: 12px; margin-top: 10px; font-family: monospace; font-size: 13px; word-break: break-all; display: none; }
        .error-tip { color: #f56c6c; font-weight: bold; }
        .success-tip { color: #67c23a; font-weight: bold; }
        .progress-wrapper { width: 100%; background: #ebeef5; border-radius: 10px; margin-top: 15px; display: none; overflow: hidden; position: relative; height: 18px; }
        .progress-bar { height: 100%; width: 0%; background: #67c23a; transition: width 0.1s ease; }
        .progress-text { position: absolute; width: 100%; text-align: center; font-size: 11px; font-weight: bold; color: #333; line-height: 18px; }
    </style>
</head>
<body>
    <div class="box">
        <h3>CDN 纯净图片中转控制面板</h3>
        <input type="text" id="urlInput" placeholder="直接粘贴各种完整的图片或 Base64 RAW URL...">
        <div class="btn-row">
            <button class="btn" id="btnGo">生成并跳转反代直链</button>
            <button class="btn btn-purple" id="btnRefine">精炼链接</button>
            <button class="btn btn-green" id="btnPick">图片转 Base64 编码</button>
        </div>
        
        <div id="resultArea" class="result-box"></div>
        
        <div class="progress-wrapper" id="progressWrapper">
            <div class="progress-bar" id="progressBar"></div>
            <div class="progress-text" id="progressText">准备编码... 0%</div>
        </div>
        <input type="file" id="fileFile" accept="image/*" style="display:none">
    </div>

    <script>
        // 静态参数定义，不带有任何 $ 符号注入逻辑
        const FRONTEND_MAX_SIZE_KB = 15360;

        // 与后端严格对标的多级复杂正则库，确保抓取各种 Raw 变体链接
        const REFINING_REGISTRY = [
            {
                name: "GIST",
                rawPath: "https/gist.githubusercontent.com/raw/",
                regexs: [
                    /gist\\.github\\.com\\/[^\\/]+\\/([0-9a-f]{32})/i,
                    /gist\\.githubusercontent\\.com\\/[^\\/]+\\/([0-9a-f]{32})/i,
                    /gist\\.githubusercontent\\.com\\/raw\\/([0-9a-f]{32})/i
                ]
            },
            {
                name: "PASTEBIN",
                rawPath: "https/pastebin.com/raw/",
                regexs: [
                    /pastebin\\.com\\/raw\\/([a-zA-Z0-9]{8})/i,
                    /pastebin\\.com\\/([a-zA-Z0-9]{8})/i
                ]
            }
        ];

        // 按钮1：直接跳转/生成通用反代
        document.getElementById('btnGo').onclick = function(e) {
            if (e) e.preventDefault();
            const v = document.getElementById('urlInput').value.trim();
            const resBox = document.getElementById('resultArea');
            if (!v) {
                resBox.style.display = 'block';
                resBox.innerHTML = "<span class='error-tip'>错误：请输入有效的图片外链！</span>";
                return false;
            }
            
            let c = v;
            if (/^https?:\\/\\//i.test(c)) {
                c = c.replace(/^https?:\\/\\//i, function(m) { return m.toLowerCase().replace('://', '/'); });
            } else if (!/^https?\\//i.test(c)) {
                c = 'https/' + c;
            }
            
            const j = window.location.origin + '/dis/' + c;
            window.open(j, '_blank');
            return false;
        };

        // 按钮2：精炼链接（直接输出最终的精原直链，在区域提示不支持）
        document.getElementById('btnRefine').onclick = function() {
            const v = document.getElementById('urlInput').value.trim();
            const resBox = document.getElementById('resultArea');
            if (!v) {
                resBox.style.display = 'block';
                resBox.innerHTML = "<span class='error-tip'>错误：请输入需要精炼的外部链接！</span>";
                return;
            }

            let matched = null;
            for (var i = 0; i < REFINING_REGISTRY.length; i++) {
                var item = REFINING_REGISTRY[i];
                for (var j = 0; j < item.regexs.length; j++) {
                    var reg = item.regexs[j];
                    var m = v.match(reg);
                    if (m && m[1]) {
                        matched = { name: item.name, id: m[1], rawPath: item.rawPath };
                        break;
                    }
                }
                if (matched) break;
            }

            resBox.style.display = 'block';
            if (!matched) {
                resBox.innerHTML = "<span class='error-tip'>暂不支持精炼此链接（未匹配到托管平台的特征 ID）</span>";
                return;
            }
            
            // 输出格式为最终纯净直链形式：/simp/https/gist.githubusercontent.com/raw/{id}
            const targetUrl = window.location.origin + '/simp/' + matched.rawPath + matched.id;
            resBox.innerHTML = "<span class='success-tip'>精炼提取成功 (" + matched.name + "):</span><br><a href='" + targetUrl + "' target='_blank'>" + targetUrl + "</a>";
        };

        // 按钮3：前端本地切片转 Base64 文本并下载
        document.getElementById('btnPick').onclick = function() {
            document.getElementById('fileFile').click();
        };

        document.getElementById('fileFile').onchange = function() {
            if (this.files.length === 0) return;
            const f = this.files[0];
            const resBox = document.getElementById('resultArea');
            if (f.size > FRONTEND_MAX_SIZE_KB * 1024) {
                resBox.style.display = 'block';
                resBox.innerHTML = "<span class='error-tip'>错误：文件大小超过前端限制（最大 " + FRONTEND_MAX_SIZE_KB + " KB）</span>";
                this.value = "";
                return;
            }
            
            const w = document.getElementById('progressWrapper'), b = document.getElementById('progressBar'), t = document.getElementById('progressText');
            w.style.display = 'block';
            b.style.width = '0%';
            t.textContent = "初始化...";
            
            const s = 1024 * 256;
            let o = 0, bin = "";
            
            const r = () => {
                const reader = new FileReader(), blob = f.slice(o, o + s);
                reader.onload = function(e) {
                    const bytes = new Uint8Array(e.target.result);
                    let ch = "";
                    for (let i = 0; i < bytes.length; i++) ch += String.fromCharCode(bytes[i]);
                    bin += ch;
                    o += s;
                    let p = Math.min(100, Math.floor((o / f.size) * 100));
                    b.style.width = p + '%';
                    t.textContent = "编码中: " + p + "%";
                    if (o < f.size) {
                        setTimeout(r, 1);
                    } else {
                        t.textContent = "正在打包...";
                        setTimeout(() => {
                            try {
                                const res = btoa(bin), out = new Blob([res], { type: "text/plain;charset=utf-8" }), u = URL.createObjectURL(out), a = document.createElement('a');
                                a.href = u; a.download = f.name + ".b64";
                                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                                URL.revokeObjectURL(u);
                                t.textContent = "转换成功！文件已开始下载";
                            } catch (err) {
                                t.textContent = "异常：" + err.message;
                            } finally {
                                document.getElementById('fileFile').value = "";
                                setTimeout(() => { w.style.display = 'none'; }, 3000);
                            }
                        }, 50);
                    }
                };
                reader.readAsArrayBuffer(blob);
            };
            r();
        };
    </script>
</body>
</html>`;
}
