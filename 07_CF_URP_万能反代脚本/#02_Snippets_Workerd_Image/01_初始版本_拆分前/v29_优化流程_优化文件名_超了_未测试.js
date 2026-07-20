// 模块1：全局核心参数配置
const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD',
    SHARE_PREFIX: '/dis',
    REFINING_PREFIX: '/ref',
    ShortName_PREFIX: '/sho',
    hide64_PREFIX: '/hid',
    DECODE_B64_PREFIX: '/dcb',
    // 模式 1：极短 Base64URL 版
    UHM_PREFIX_1: '/uhm1',
    UHM_OUTPUT_1: '/uem1',
    // 模式 2：超长 Hex 版
    UHM_PREFIX_2: '/uhm2',
    UHM_OUTPUT_2: '/uem2',
    // 模式 3：Deflate 压缩 + Base64URL 版
    UHM_PREFIX_3: '/uhm3',
    UHM_OUTPUT_3: '/uem3',
    STEALTH_KEY: 'Tmalll_Secret_Salt_2026',
    DEBUG_MODE: 1,
    CACHE_TTL: 2592000,
    BACKEND_MAX_SIZE_KB: 10240,
    ALLOW_BACKEND_CHUNKED_RAW: 1,
    ALLOW_FALLBACK_DOWNLOAD: 1,
    FRONTEND_MAX_SIZE_KB: 15360
};

// 模块2：魔数、MIME类型及后缀名映射注册表
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

// 模块3：第三方 Raw 托管源站配置表
const REFINING_REGISTRY = [
    {
        name: "GIST", shortName: "gis", ref_URL: "https://gist.githubusercontent.com/raw/",
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
        name: "PASTEBIN", shortName: "pas", ref_URL: "https://pastebin.com/raw/",
        match_group: [
            { regex: /pastebin\.com\/raw\/([a-zA-Z0-9]{8})/i, hasFile: false },
            { regex: /pastebin\.com\/([a-zA-Z0-9]{8})/i, hasFile: false }
        ],
        toRaw: (id) => `https://pastebin.com/raw/${id}`
    }
];

// 模块4：托管源匹配和 ID 文件名提取函数
function tryRefiningUrlEx(urlStr) {
    if (!urlStr) return null;
    for (const site of REFINING_REGISTRY) {
        for (const item of site.match_group) {
            const match = urlStr.match(item.regex);
            if (match && match[1]) {
                return {
                    id: match[1], siteConfig: site, refinedUrlStr: site.toRaw(match[1]),
                    webFileName: (item.hasFile && match[2]) ? match[2] : ""
                };
            }
        }
    }
    return null;
}

// 模块5：原文件名虚拟后缀清洗函数
function cleanOriginalName(webFileName) {
    if (!webFileName) return "";
    let name = webFileName, lower = name.toLowerCase();
    if (lower.endsWith('.b64')) return name.slice(0, -4);
    if (lower.endsWith('.base64')) return name.slice(0, -7);
    return name;
}

// 模块6：反代目标 URL 规范化解析函数
function parseTargetUrl(path) {
    if (!path) return null;
    let cleanPath = path.replace(/\/+$/, '');
    if (!/^https?[:\/]+/i.test(cleanPath)) return null;
    let full = cleanPath.replace(/^https?[:\/]+/i, 'https://');
    if (cleanPath.startsWith('http/')) full = cleanPath.replace(/^http[:\/]+/i, 'http://');
    try { return new URL(full); } catch { return null; }
}

// 模块7：核心文件名决策引擎（仅对非图片的文件模式生效）
function determineOutputFile(matchedMeta, currentRequestPath) {
    if (matchedMeta.isImage) return `image.${matchedMeta.ext}`;
    let decodeTarget = currentRequestPath;
    if (decodeTarget.includes('%')) {
        try {
            let prev = "";
            while (decodeTarget !== prev && decodeTarget.includes('%')) {
                prev = decodeTarget; decodeTarget = decodeURIComponent(decodeTarget);
            }
        } catch (e) {}
    }
    decodeTarget = decodeTarget.replace(/\/+$/, '');
    const lastSlash = decodeTarget.lastIndexOf('/');
    let resName = lastSlash !== -1 ? decodeTarget.substring(lastSlash + 1) : decodeTarget;
    resName = resName.trim();
    const lower = resName.toLowerCase();
    if (lower.endsWith('.b64')) resName = resName.slice(0, -4);
    else if (lower.endsWith('.base64')) resName = resName.slice(0, -7);
    if (!resName || resName.toLowerCase() === 'raw') {
        const segs = decodeTarget.split('/').filter(s => s && s.toLowerCase() !== 'raw');
        if (segs.length > 0) resName = segs[segs.length - 1];
    }
    return resName || matchedMeta.fallbackName;
}

// 模块8：后端 Base64 纯文本转二进制流解码器
function decodeBase64(rawText, maxBytes) {
    let cleaned = rawText.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
    const mod = cleaned.length % 4;
    if (mod > 1) cleaned += "=".repeat(4 - mod);
    if (cleaned.length > maxBytes) throw new Error("Stream size overflow limit.");
    const binary = atob(cleaned), len = binary.length, bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) { bytes[i] = binary.charCodeAt(i); }
    return bytes.buffer;
}

// 模块9：高强度密码学加解密与多策略压缩/编码管道核心
async function getStealthCryptoContext(seed) {
    const enc = new TextEncoder(), msgBuffer = enc.encode(seed), hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer), hashArray = new Uint8Array(hashBuffer);
    const keyKey = await crypto.subtle.importKey('raw', hashArray.subarray(0, 16), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    return { key: keyKey, iv: hashArray.subarray(16, 28) };
}

async function coreEncrypt(plainBytes, seed) {
    const ctx = await getStealthCryptoContext(seed);
    return await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ctx.iv }, ctx.key, plainBytes);
}
async function coreDecrypt(cipherBytes, seed) {
    const ctx = await getStealthCryptoContext(seed);
    return await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ctx.iv }, ctx.key, cipherBytes);
}

function bytesToBase64Url(arr) {
    return btoa(String.fromCharCode(...new Uint8Array(arr))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function base64UrlToBytes(s) {
    const cleanS = s.replace(/-/g, '+').replace(/_/g, '/'), pad = (4 - (cleanS.length % 4)) % 4, rawStr = atob(cleanS + "=".repeat(pad)), arr = new Uint8Array(rawStr.length);
    for (let i = 0; i < rawStr.length; i++) arr[i] = rawStr.charCodeAt(i);
    return arr.buffer;
}
function bytesToHex(arr) {
    return Array.from(new Uint8Array(arr)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex) {
    return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))).buffer;
}

async function encryptStealthText(plainText, seed, mode = 1) {
    const enc = new TextEncoder();
    let srcBytes = enc.encode(plainText);
    if (mode === 3) {
        const cs = new CompressionStream('deflate');
        const writer = cs.writable.getWriter();
        writer.write(srcBytes);
        writer.close();
        srcBytes = new Uint8Array(await new Response(cs.readable).arrayBuffer());
    }
    const encryptedBuffer = await coreEncrypt(srcBytes, seed);
    if (mode === 2) return bytesToHex(encryptedBuffer);
    return bytesToBase64Url(encryptedBuffer);
}

async function decryptStealthText(cipherText, seed, mode = 1) {
    try {
        let cipherBytes = (mode === 2) ? hexToBytes(cipherText) : base64UrlToBytes(cipherText);
        let decryptedBuffer = await coreDecrypt(cipherBytes, seed);
        if (mode === 3) {
            const ds = new DecompressionStream('deflate');
            const writer = ds.writable.getWriter();
            writer.write(new Uint8Array(decryptedBuffer));
            writer.close();
            decryptedBuffer = await new Response(ds.readable).arrayBuffer();
        }
        return new TextDecoder().decode(decryptedBuffer);
    } catch (e) { return null; }
}

// 模块10：Workers 路由控制与网络代理核心逻辑
export default {
    async fetch(request, env, ctx) {
        const realProto = request.headers.get("x-real-scheme"), realHost = request.headers.get("x-real-host");
        if (realProto && realHost) {
            const u = new URL(request.url);
            request = new Request(`${realProto}://${realHost}${u.pathname}${u.search}${u.hash}`, {
                method: request.method, headers: request.headers,
                body: request.method === "GET" || request.method === "HEAD" ? null : request.body, redirect: "manual"
            });
        }
        const url = new URL(request.url), 
              pAdmin = CONFIG.AUTH_PREFIX.replace(/^\/+|\/+$/g, ''), 
              pShare = CONFIG.SHARE_PREFIX.replace(/^\/+|\/+$/g, ''), 
              pRef = CONFIG.REFINING_PREFIX.replace(/^\/+|\/+$/g, ''), 
              pSho = CONFIG.ShortName_PREFIX.replace(/^\/+|\/+$/g, ''), 
              pHid = CONFIG.hide64_PREFIX.replace(/^\/+|\/+$/g, ''), 
              pDcb = CONFIG.DECODE_B64_PREFIX.replace(/^\/+|\/+$/g, ''), 
              pUhm1 = CONFIG.UHM_PREFIX_1.replace(/^\/+|\/+$/g, ''), 
              pUem1 = CONFIG.UHM_OUTPUT_1.replace(/^\/+|\/+$/g, ''),
              pUhm2 = CONFIG.UHM_PREFIX_2.replace(/^\/+|\/+$/g, ''), 
              pUem2 = CONFIG.UHM_OUTPUT_2.replace(/^\/+|\/+$/g, ''),
              pUhm3 = CONFIG.UHM_PREFIX_3.replace(/^\/+|\/+$/g, ''), 
              pUem3 = CONFIG.UHM_OUTPUT_3.replace(/^\/+|\/+$/g, ''),
              cleanPath = url.pathname.toLowerCase();
              
        if (cleanPath === '/favicon.ico' || cleanPath === '/apple-touch-icon.png' || cleanPath === '/apple-touch-icon-precomposed.png' || cleanPath === '/site.webmanifest' || cleanPath === '/browserconfig.xml' || cleanPath.includes('android-chrome-')) return new Response(null, { status: 204 });
        if (url.pathname === '/' + pAdmin || url.pathname === '/' + pAdmin + '/') return new Response(getPanelHTML(), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

        // ================= 前置辅助：基于魔数和路径判断是否是图片的预检流程 =================
        let isPreCheckImage = false;
        let preCheckExt = "jpg"; // 默认兜底后缀
        
        // 1. 通过请求路径后缀来辅助判断是否是图片（用于进入 uhm / sho / ref 等前置生成流程）
        const lowerUrlPath = url.pathname.toLowerCase();
        for (const m of MAGIC_REGISTRY) {
            if (m.isImage && m.ext && (lowerUrlPath.endsWith('.' + m.ext) || lowerUrlPath.includes('.' + m.ext + '.') || lowerUrlPath.includes('.' + m.ext + '/'))) {
                isPreCheckImage = true;
                preCheckExt = m.ext;
                break;
            }
        }
        if (lowerUrlPath.includes('.b64') || lowerUrlPath.includes('.base64')) {
            // 如果带有了 .b64，再进一步提取前面的图片后缀
            for (const m of MAGIC_REGISTRY) {
                if (m.isImage && m.ext && lowerUrlPath.includes('.' + m.ext + '.')) {
                    isPreCheckImage = true;
                    preCheckExt = m.ext;
                    break;
                }
            }
        }

        // ================= 路由分支 1：处理 /ref/ 路由 (改进后的图片模式清洗) =================
        if (url.pathname.startsWith('/' + pRef + '/')) {
            let targetPath = url.pathname.substring(pRef.length + 2), rawTargetUrl = parseTargetUrl(targetPath + url.search + url.hash);
            if (!rawTargetUrl) return new Response("Invalid Target URL for Refining", { status: 400 });
            const res = tryRefiningUrlEx(rawTargetUrl.toString());
            
            if (isPreCheckImage) {
                // 图片模式新增处理：如果匹配成功，清洗掉长尾巴
                if (res) {
                    return Response.redirect(`${url.origin}/${pShare}/${res.refinedUrlStr.replace(/^https?:\/\//i, m => m.toLowerCase().replace('://', '/'))}/image.${preCheckExt}`, 302);
                } else {
                    let cleanUrlPart = rawTargetUrl.toString();
                    if (/^https?:\/\//i.test(cleanUrlPart)) cleanUrlPart = cleanUrlPart.replace(/^https?:\/\//i, m => m.toLowerCase().replace('://', '/'));
                    return Response.redirect(`${url.origin}/${pShare}/${cleanUrlPart}/image.${preCheckExt}`, 302);
                }
            } else {
                // 文件模式：保持原样不做图片定制精简
                let cleanUrlPart = res ? res.refinedUrlStr : rawTargetUrl.toString();
                if (res && res.webFileName) cleanUrlPart = cleanUrlPart.replace(/[\/]+$/, '') + '/' + res.webFileName;
                if (/^https?:\/\//i.test(cleanUrlPart)) cleanUrlPart = cleanUrlPart.replace(/^https?:\/\//i, m => m.toLowerCase().replace('://', '/'));
                return Response.redirect(url.origin + '/' + pShare + '/' + cleanUrlPart, 302);
            }
        }

        // ================= 路由分支 2：处理 /sho/ 路由 (改进后的图片模式清洗) =================
        if (url.pathname.startsWith('/' + pSho + '/')) {
            let targetPath = url.pathname.substring(pSho.length + 2), rawTargetUrl = parseTargetUrl(targetPath + url.search + url.hash);
            if (!rawTargetUrl) return new Response("Invalid Target URL for Short Mode", { status: 400 });
            const res = tryRefiningUrlEx(rawTargetUrl.toString());
            
            if (isPreCheckImage) {
                if (res) {
                    return Response.redirect(`${url.origin}/${res.siteConfig.shortName}/${res.id}/image.${preCheckExt}`, 302);
                } else {
                    let cleanUrlPart = rawTargetUrl.toString();
                    if (/^https?:\/\//i.test(cleanUrlPart)) cleanUrlPart = cleanUrlPart.replace(/^https?:\/\//i, m => m.toLowerCase().replace('://', '/'));
                    return Response.redirect(`${url.origin}/${pShare}/${cleanUrlPart}/image.${preCheckExt}`, 302);
                }
            } else {
                // 文件模式原有逻辑
                if (res) {
                    const origName = cleanOriginalName(res.webFileName);
                    return Response.redirect(origName ? `${url.origin}/${res.siteConfig.shortName}/${res.id}/${origName}` : `${url.origin}/${res.siteConfig.shortName}/${res.id}/UnknownBinary.bin`, 302);
                } else {
                    let cleanUrlPart = rawTargetUrl.toString();
                    if (/^https?:\/\//i.test(cleanUrlPart)) cleanUrlPart = cleanUrlPart.replace(/^https?:\/\//i, m => m.toLowerCase().replace('://', '/'));
                    return Response.redirect(`${url.origin}/${pShare}/${cleanUrlPart}`, 302);
                }
            }
        }

        // ================= 路由分支 3：处理 uhm1 / uhm2 / uhm3 路由 (基于优化后的 sho 载荷加密) =================
        let currentUhmMode = 0;
        let activeUemPrefix = "";
        if (url.pathname.startsWith('/' + pUhm1 + '/')) { currentUhmMode = 1; activeUemPrefix = pUem1; }
        else if (url.pathname.startsWith('/' + pUhm2 + '/')) { currentUhmMode = 2; activeUemPrefix = pUem2; }
        else if (url.pathname.startsWith('/' + pUhm3 + '/')) { currentUhmMode = 3; activeUemPrefix = pUem3; }

        if (currentUhmMode > 0) {
            let pPrefix = currentUhmMode === 1 ? pUhm1 : (currentUhmMode === 2 ? pUhm2 : pUhm3);
            let targetPath = url.pathname.substring(pPrefix.length + 2), rawTargetUrl = parseTargetUrl(targetPath + url.search + url.hash);
            if (!rawTargetUrl) return new Response(`Invalid Target URL for UHM Mode ${currentUhmMode}`, { status: 400 });
            const res = tryRefiningUrlEx(rawTargetUrl.toString());
            
            let base64UrlPayload = "";
            let outputName = "UnknownBinary.bin";

            if (isPreCheckImage) {
                // 图片模式：获取极精简规范化后的中间态格式载荷
                if (res) {
                    base64UrlPayload = btoa(`${res.siteConfig.shortName}/${res.id}`).replace(/=/g, '');
                } else {
                    let cleanUrlPart = rawTargetUrl.toString();
                    if (/^https?:\/\//i.test(cleanUrlPart)) cleanUrlPart = cleanUrlPart.replace(/^https?:\/\//i, m => m.toLowerCase().replace('://', '/'));
                    base64UrlPayload = btoa(`${pShare}/${cleanUrlPart}`).replace(/=/g, '');
                }
                outputName = `image.${preCheckExt}`;
            } else {
                // 文件模式原有逻辑
                if (res) {
                    base64UrlPayload = btoa(`${res.siteConfig.shortName}/${res.id}`).replace(/=/g, '');
                    let origName = cleanOriginalName(res.webFileName);
                    outputName = origName || "UnknownBinary.bin";
                } else {
                    let cleanUrlPart = rawTargetUrl.toString();
                    if (/^https?:\/\//i.test(cleanUrlPart)) cleanUrlPart = cleanUrlPart.replace(/^https?:\/\//i, m => m.toLowerCase().replace('://', '/'));
                    base64UrlPayload = btoa(`${pShare}/${cleanUrlPart}`).replace(/=/g, '');
                    const lastSl = cleanUrlPart.lastIndexOf('/');
                    outputName = cleanOriginalName(lastSl !== -1 ? cleanUrlPart.substring(lastSl + 1) : "UnknownBinary.bin");
                }
            }

            const encryptedUrl = await encryptStealthText(base64UrlPayload, CONFIG.STEALTH_KEY, currentUhmMode);
            return Response.redirect(`${url.origin}/${activeUemPrefix}/${encryptedUrl}/${outputName}`, 302);
        }
        
        // ================= 路由分支 4：处理 /hid/ 明文Base64模式 (同样基于 sho 规范清洗载荷) =================
        if (url.pathname.startsWith('/' + pHid + '/')) {
            let targetPath = url.pathname.substring(pHid.length + 2), rawTargetUrl = parseTargetUrl(targetPath + url.search + url.hash);
            if (!rawTargetUrl) return new Response("Invalid Target URL for Hide Mode", { status: 400 });
            const res = tryRefiningUrlEx(rawTargetUrl.toString());
            
            let encPart = "";
            let outputName = "UnknownBinary.bin";

            if (isPreCheckImage) {
                if (res) {
                    encPart = btoa(`${res.siteConfig.shortName}/${res.id}`).replace(/=/g, '');
                } else {
                    let cleanUrlPart = rawTargetUrl.toString();
                    if (/^https?:\/\//i.test(cleanUrlPart)) cleanUrlPart = cleanUrlPart.replace(/^https?:\/\//i, m => m.toLowerCase().replace('://', '/'));
                    encPart = btoa(`${pShare}/${cleanUrlPart}`).replace(/=/g, '');
                }
                outputName = `image.${preCheckExt}`;
            } else {
                if (res) {
                    encPart = btoa(`${res.siteConfig.shortName}/${res.id}`).replace(/=/g, '');
                    let origName = cleanOriginalName(res.webFileName);
                    outputName = origName || "UnknownBinary.bin";
                } else {
                    let cleanUrlPart = rawTargetUrl.toString();
                    if (/^https?:\/\//i.test(cleanUrlPart)) cleanUrlPart = cleanUrlPart.replace(/^https?:\/\//i, m => m.toLowerCase().replace('://', '/'));
                    encPart = btoa(`${pShare}/${cleanUrlPart}`).replace(/=/g, '');
                    const lastSl = cleanUrlPart.lastIndexOf('/');
                    outputName = cleanOriginalName(lastSl !== -1 ? cleanUrlPart.substring(lastSl + 1) : "UnknownBinary.bin");
                }
            }
            return Response.redirect(`${url.origin}/${pDcb}/${encPart}/${outputName}`, 302);
        }

        // ================= 路由分支 5：输出端反向解码分发（uem1/2/3, dcb等解密还原） =================
        let isShortAliasRoute = false, matchedAliasConfig = null, activePathname = url.pathname;
        
        let currentUemMode = 0;
        let matchedUemPrefix = "";
        if (url.pathname.startsWith('/' + pUem1 + '/')) { currentUemMode = 1; matchedUemPrefix = pUem1; }
        else if (url.pathname.startsWith('/' + pUem2 + '/')) { currentUemMode = 2; matchedUemPrefix = pUem2; }
        else if (url.pathname.startsWith('/' + pUem3 + '/')) { currentUemMode = 3; matchedUemPrefix = pUem3; }

        if (currentUemMode > 0) {
            const rawPart = url.pathname.substring(matchedUemPrefix.length + 2), firstSlash = rawPart.indexOf('/'), cryptPart = firstSlash !== -1 ? rawPart.substring(0, firstSlash) : rawPart;
            const decryptedB64 = await decryptStealthText(cryptPart, CONFIG.STEALTH_KEY, currentUemMode);
            if (!decryptedB64) return new Response(`Forbidden: Invalid or Tampered UHM Payload (Mode ${currentUemMode})`, { status: 403 });
            try {
                let decodedStr = atob(decryptedB64).trim();
                if (decodedStr.startsWith(pShare + '/')) { activePathname = decodedStr; } else {
                    const firstPart = decodedStr.indexOf('/');
                    if (firstPart !== -1) {
                        const sName = decodedStr.substring(0, firstPart), siteId = decodedStr.substring(firstPart + 1), targetSite = REFINING_REGISTRY.find(s => s.shortName === sName);
                        if (targetSite) { isShortAliasRoute = true; matchedAliasConfig = targetSite; activePathname = `/${sName}/${siteId}`; }
                    }
                }
            } catch (e) { return new Response("Forbidden: Bad Payload Structure", { status: 403 }); }
        }
        
        if (url.pathname.startsWith('/' + pDcb + '/')) {
            const rawPart = url.pathname.substring(pDcb.length + 2), firstSlash = rawPart.indexOf('/'), base64UrlParam = firstSlash !== -1 ? rawPart.substring(0, firstSlash) : rawPart;
            try {
                let decodedStr = atob(base64UrlParam).trim();
                if (decodedStr.startsWith(pShare + '/')) { activePathname = decodedStr; } else {
                    const firstPart = decodedStr.indexOf('/');
                    if (firstPart !== -1) {
                        const sName = decodedStr.substring(0, firstPart), siteId = decodedStr.substring(firstPart + 1), targetSite = REFINING_REGISTRY.find(s => s.shortName === sName);
                        if (targetSite) { isShortAliasRoute = true; matchedAliasConfig = targetSite; activePathname = `/${sName}/${siteId}`; }
                    }
                }
            } catch (e) { return new Response("Invalid Hidden Base64 Payload Structure", { status: 400 }); }
        }
        
        if (!isShortAliasRoute && !activePathname.startsWith('/' + pShare + '/')) {
            for (const site of REFINING_REGISTRY) {
                if (url.pathname.startsWith('/' + site.shortName + '/')) {
                    isShortAliasRoute = true; matchedAliasConfig = site;
                    const rem = url.pathname.substring(site.shortName.length + 2), remSlash = rem.indexOf('/');
                    if (remSlash !== -1) activePathname = `/${site.shortName}/${rem.substring(0, remSlash)}`;
                    break;
                }
            }
        }
        
        if (isShortAliasRoute && matchedAliasConfig) {
            activePathname = '/' + pShare + '/' + matchedAliasConfig.ref_URL.replace('://', '/') + activePathname.substring(matchedAliasConfig.shortName.length + 2);
        }
        
        if (!activePathname.startsWith('/' + pShare + '/')) return new Response("Forbidden: Access Denied", { status: 403 });
        
        let targetPath = activePathname.substring(pShare.length + 2), hasVirtualImageSuffix = false, matchedExt = "";
        const lowerActivePath = activePathname.toLowerCase();
        for (const item of MAGIC_REGISTRY) {
            if (item.isImage && lowerActivePath.endsWith('/image.' + item.ext)) {
                hasVirtualImageSuffix = true; matchedExt = item.ext; break;
            }
        }
        if (hasVirtualImageSuffix) targetPath = targetPath.substring(0, targetPath.length - ('/image.' + matchedExt).length);
        
        let targetUrl = parseTargetUrl(targetPath + url.search + url.hash);
        if (!targetUrl) return new Response("Invalid Target URL", { status: 400 });
        
        const cache = caches.default, cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) { const cachedResponse = await cache.match(cacheKey); if (cachedResponse) return cachedResponse; }
        
        const fetchHeaders = new Headers(), userUA = request.headers.get('User-Agent');
        fetchHeaders.set('User-Agent', userUA || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        let upstream = await fetch(targetUrl, { method: 'GET', headers: fetchHeaders, redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: ${upstream.status}`, { status: upstream.status });
        if (!upstream.headers.get("Content-Length") && CONFIG.ALLOW_BACKEND_CHUNKED_RAW !== 1) return new Response("Forbidden: Streaming without Content-Length is rejected.", { status: 403 });
        
        const previewStream = upstream.clone(), reader = previewStream.body.getReader(), { value } = await reader.read(), chunkText = new TextDecoder().decode(value).trim().substring(0, 30), cleanChunk = chunkText.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
        let matchedMeta = MAGIC_REGISTRY.find(item => item.b64_prefix && cleanChunk.startsWith(item.b64_prefix)) || MAGIC_REGISTRY[MAGIC_REGISTRY.length - 1];
        
        // 核心变量提取赋予，供最终响应使用
        const OUTPUT_FILENAME = determineOutputFile(matchedMeta, url.pathname);
        
        if (matchedMeta.isImage) {
            if (!hasVirtualImageSuffix && !url.pathname.toLowerCase().endsWith('.' + matchedMeta.ext)) {
                const redirectUrl = new URL(request.url); redirectUrl.pathname = redirectUrl.pathname.replace(/[\/]+$/, '') + '/image.' + matchedMeta.ext;
                return Response.redirect(redirectUrl.toString(), 302);
            }
            try {
                const finalBuffer = decodeBase64(await upstream.text(), CONFIG.BACKEND_MAX_SIZE_KB * 1024), respHeaders = new Headers({
                    "Access-Control-Allow-Origin": "*", "Content-Type": matchedMeta.mime, "Content-Disposition": `inline; filename="${OUTPUT_FILENAME}"`,
                    "Cache-Control": CONFIG.DEBUG_MODE === 1 ? "no-store" : `public, max-age=${CONFIG.CACHE_TTL}`
                });
                if (CONFIG.DEBUG_MODE === 1) respHeaders.set("X-Sniff-Status", "Success-Image-Redirected");
                const response = new Response(finalBuffer, { status: 200, headers: respHeaders });
                if (CONFIG.DEBUG_MODE !== 1) ctx.waitUntil(cache.put(cacheKey, response.clone()));
                return response;
            } catch (e) { return new Response(`Decoder Exception: ${e.message}`, { status: 500 }); }
        } else {
            if (CONFIG.ALLOW_FALLBACK_DOWNLOAD !== 1) return new Response("Forbidden: Not a valid image Base64 stream.", { status: 403 });
            return new Response(getFallbackDecoderHTML(await upstream.text(), OUTPUT_FILENAME), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
    }
};

// 模块11：前端后台管理控制面板页面模板
function getPanelHTML() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CDN 极简中转站</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;background:#f4f6f9;color:#333;padding:20px;display:flex;flex-direction:column;align-items:center}.box{width:100%;max-width:650px;background:#fff;padding:20px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);margin-top:40px}input[type="text"]{width:100%;padding:14px;font-size:14px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;margin-bottom:15px;outline:none}input[type="text"]:focus{border-color:#409eff}.btn-row{display:flex;gap:12px}.btn{flex:1;padding:14px;font-size:14px;color:#fff;background:#409eff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;text-align:center;box-sizing:border-box}.btn:hover{background:#66b1ff}.btn-green{background:#67c23a}.btn-green:hover{background:#85ce61}.progress-wrapper{width:100%;background:#ebeef5;border-radius:10px;margin-top:15px;display:none;overflow:hidden;position:relative;height:18px}.progress-bar{height:100%;width:0%;background:#67c23a;transition:width 0.1s ease}.progress-text{position:absolute;width:100%;text-align:center;font-size:11px;font-weight:bold;color:#333;line-height:18px}</style></head><body><div class="box"><h3>CDN 极简中转控制面板</h3><input type="text" id="urlInput" placeholder="直接粘贴各种完整的 RAW URL..."><div class="btn-row"><button class="btn" id="btnGo">生成并跳转反代直链</button><button class="btn btn-green" id="btnPick">编码文件为Base64</button></div><div class="progress-wrapper" id="progressWrapper"><div class="progress-bar" id="progressBar"></div><div class="progress-text" id="progressText">准备编码... 0%</div></div><input type="file" id="fileFile" style="display:none"></div><script>const SHARE_PREFIX="${CONFIG.SHARE_PREFIX}",DEBUG_MODE=${CONFIG.DEBUG_MODE},FRONTEND_MAX_SIZE_KB=${CONFIG.FRONTEND_MAX_SIZE_KB};document.getElementById('btnGo').onclick=function(e){if(e){e.preventDefault();e.stopPropagation()}const v=document.getElementById('urlInput').value.trim();if(!v){alert("请输入外链！");return false}let c=v;if(/^https?:\\/\\//i.test(c)){c=c.replace(/^https?:\\/\\//i,m=>m.toLowerCase().replace('://','/'))}else if(!/^https?\\//i.test(c)){c='https/'+c}const j=window.location.origin+SHARE_PREFIX+'/'+c;if(DEBUG_MODE===1){window.location.href=j}else{window.open(j,'_blank')}return false};document.getElementById('btnPick').onclick=function(){document.getElementById('fileFile').click()};document.getElementById('fileFile').onchange=function(){if(this.files.length===0)return;const f=this.files[0];if(f.size>FRONTEND_MAX_SIZE_KB*1024){alert("超大限制");this.value="";return}const w=document.getElementById('progressWrapper'),b=document.getElementById('progressBar'),t=document.getElementById('progressText');w.style.display='block';b.style.width='0%';t.textContent="初始化...";const s=1024*256;let o=0,bin="";const r=()=>{const reader=new FileReader(),blob=f.slice(o,o+s);reader.onload=function(e){const bytes=new Uint8Array(e.target.result);let ch="";for(let i=0;i<bytes.length;i++)ch+=String.fromCharCode(bytes[i]);bin+=ch;o+=s;let p=Math.min(100,Math.floor((o/f.size)*100));b.style.width=p+'%';t.textContent="编码中: "+p+"%";if(o<f.size){setTimeout(r,1)}else{t.textContent="正在打包...";setTimeout(()=>{try{const res=btoa(bin),out=new Blob([res],{type:"text/plain;charset=utf-8"}),u=URL.createObjectURL(out),a=document.createElement('a');a.href=u;a.download=f.name+".b64";document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);t.textContent="成功！"}catch(err){t.textContent="异常"}finally{document.getElementById('fileFile').value="";setTimeout(()=>{w.style.display='none'},3000)}},50)}};reader.readAsArrayBuffer(blob)};r()};</script></body></html>`;
}

// 模块12：前端通用二进制流分块解码沙盒页面模板
function getFallbackDecoderHTML(rawPayload, cleanFileName) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>正在落地资产...</title><style>body{font-family:sans-serif;background:#f4f6f9;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}.card{background:#fff;padding:30px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.1);text-align:center;width:100%;max-width:440px;box-sizing:border-box}.progress-wrapper{width:100%;background:#ebeef5;border-radius:10px;margin-top:20px;overflow:hidden;position:relative;height:18px}.progress-bar{height:100%;width:0%;background:#e6a23c;transition:width 0.1s ease}.progress-text{position:absolute;width:100%;left:0;top:0;text-align:center;font-size:11px;font-weight:bold;color:#333;line-height:18px}</style></head><body><div class="card"><h3 id="statusTitle" style="color:#e6a23c">正在落地通用数据流</h3><p style="font-size:13px;font-weight:bold;word-break:break-all">${cleanFileName}</p><div class="progress-wrapper"><div class="progress-bar" id="progressBar"></div><div class="progress-text" id="progressText">准备... 0%</div></div></div><script>(function(){const bar=document.getElementById('progressBar'),txt=document.getElementById('progressText'),title=document.getElementById('statusTitle');try{const raw= \`${rawPayload.replace(/[`\\$]/g, '\\$&')}\`.replace(/[\\r\\n\\s\\t]+/g,'').replace(/^data:[^,]+,/,''),tot=raw.length;let bin="",o=0;const s=1024*512,d=()=>{const seg=raw.substring(o,o+s);bin+=atob(seg);o+=s;let p=Math.min(100,Math.floor((o/tot)*100));bar.style.width=p+'%';txt.textContent="解码中: "+p+"%";if(o<tot){setTimeout(d,1)}else{txt.textContent="正在装配...";setTimeout(()=>{const len=bin.length,bytes=new Uint8Array(len);for(let i=0;i<len;i++)bytes[i]=bin.charCodeAt(i);const blob=new Blob([bytes.buffer],{type:"application/octet-stream"}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download="${cleanFileName}";document.body.appendChild(a);a.click();setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(u);if(${CONFIG.DEBUG_MODE}!==1){window.close()}else{bar.style.backgroundColor='#67c23a';title.textContent='下载完成';title.style.color='#67c23a';txt.textContent="100%";}},800)},50)}};d()}catch(e){txt.textContent="故障"}})();</script></body></html>`;
}