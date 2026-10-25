// 模块1：全局核心参数配置
const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD',
    SHARE_PREFIX: '/dis',
    REFINING_PREFIX: '/ref',
    REFINING_OUT_PREFIX: '/simp', // 新增：ref模式精炼后的专属输出别名
    ShortName_PREFIX: '/sho',
    hide64_PREFIX: '/hid',
    DECODE_B64_PREFIX: '/dcb',
    UHM_PREFIX_1: '/uhm1', UHM_OUTPUT_1: '/uem1',
    UHM_PREFIX_2: '/uhm2', UHM_OUTPUT_2: '/uem2',
    UHM_PREFIX_3: '/uhm3', UHM_OUTPUT_3: '/uem3',
    STEALTH_KEY: 'Tmalll_Secret_Salt_2026',
    DEBUG_MODE: 1,
    CACHE_TTL: 2592000,
    BACKEND_MAX_SIZE_KB: 10240,
    ALLOW_BACKEND_CHUNKED_RAW: 1,
    ALLOW_FALLBACK_DOWNLOAD: 1,
    FRONTEND_MAX_SIZE_KB: 15360
};

// 模块2：魔数映射注册表
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
        name: "GIST", shortName: "gis", aliasPrefix: "/gis", ref_URL: "https://gist.githubusercontent.com/raw/",
        match_group: [
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/[0-9a-f]{40}\/([^\/\?#]+)/i },
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/([^\/\?#]+)/i },
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})\/raw/i },
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})/i },
            { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/[0-9a-f]{40}\/([^\/\?#]+)/i },
            { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/([^\/\?#]+)/i },
            { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})\/raw/i },
            { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})/i },
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

// 深度递归 URL 解码工具
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

// 提取文件名
function parseBinaryName(urlStr) {
    if (!urlStr) return "";
    let cleanUrl = urlStr.trim().replace(/\/+$/, '');
    if (/\/(image\.[a-z0-9]+)$/i.test(cleanUrl)) {
        cleanUrl = cleanUrl.substring(0, cleanUrl.lastIndexOf('/'));
    }
    let lastSlashIdx = cleanUrl.lastIndexOf('/');
    if (lastSlashIdx === -1) return deepDecode(cleanUrl);
    let name = cleanUrl.substring(lastSlashIdx + 1);
    return deepDecode(name.replace(/[\?#].*$/, ''));
}

// 筛选注册表
function parseRefRegistry(urlStr) {
    if (!urlStr) return null;
    let cleanUrl = urlStr.trim();
    for (const site of REFINING_REGISTRY) {
        for (const item of site.match_group) {
            const match = cleanUrl.match(item.regex);
            if (match && match[1]) {
                return {
                    site: site,
                    ID: match[1],
                    ref_URL: site.toRaw(match[1]),
                    shortName: site.shortName,
                    aliasPrefix: site.aliasPrefix
                };
            }
        }
    }
    return null;
}

// 规范化反代格式部分的拼装
function makeFullUrlPart(urlStr, pShare) {
    let c = urlStr.trim();
    if (/^https?:\/\//i.test(c)) {
        c = c.replace(/^https?:\/\//i, m => m.toLowerCase().replace('://', '/'));
    } else if (!/^https?\//i.test(c)) {
        c = 'https/' + c;
    }
    return `${pShare}/${c}`;
}

// 加解密相关
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
              pSimp = CONFIG.REFINING_OUT_PREFIX.replace(/^\/|\/$/g, ''), // 新增 simp
              pSho = CONFIG.ShortName_PREFIX.replace(/^\/|\/$/g, ''), 
              pHid = CONFIG.hide64_PREFIX.replace(/^\/|\/$/g, ''), 
              pDcb = CONFIG.DECODE_B64_PREFIX.replace(/^\/|\/$/g, ''), 
              pUhm = [CONFIG.UHM_PREFIX_1, CONFIG.UHM_PREFIX_2, CONFIG.UHM_PREFIX_3].map(p => p.replace(/^\/|\/$/g, '')),
              pUem = [CONFIG.UHM_OUTPUT_1, CONFIG.UHM_OUTPUT_2, CONFIG.UHM_OUTPUT_3].map(p => p.replace(/^\/|\/$/g, ''));

        if (['/favicon.ico', '/apple-touch-icon.png', '/site.webmanifest'].some(p => url.pathname.toLowerCase().startsWith(p))) return new Response(null, { status: 204 });
        if (url.pathname === '/' + pAdmin || url.pathname === '/' + pAdmin + '/') return new Response(getPanelHTML(), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

        // =================【/ref 路由分发模块：只输出到 /simp/】=================
        if (url.pathname.startsWith('/' + pRef + '/')) {
            let remain = url.pathname.substring(pRef.length + 2) + url.search + url.hash;
            let fullUrl = remain.replace(/^https?[:\/]+/i, 'https://').replace('http/', 'http://');
            let binaryName = parseBinaryName(fullUrl);
            let registryResult = parseRefRegistry(fullUrl);
            if (registryResult) {
                // 转入专属的精炼输出路径 /simp/ 别名，绝不污染原生的 /dis 
                return Response.redirect(`${url.origin}/${pSimp}/${registryResult.ref_URL.replace('://', '/')}/${encodeURIComponent(binaryName)}`, 302);
            }
            return Response.redirect(`${url.origin}/${makeFullUrlPart(fullUrl, pShare)}`, 302);
        }

        // =================【/sho 别名分发模块：输出短路径】=================
        if (url.pathname.startsWith('/' + pSho + '/')) {
            let remain = url.pathname.substring(pSho.length + 2) + url.search + url.hash;
            let fullUrl = remain.replace(/^https?[:\/]+/i, 'https://').replace('http/', 'http://');
            let binaryName = parseBinaryName(fullUrl);
            let registryResult = parseRefRegistry(fullUrl);
            if (registryResult) {
                return Response.redirect(`${url.origin}${registryResult.aliasPrefix}/${registryResult.ID}/${encodeURIComponent(binaryName)}`, 302);
            }
            return Response.redirect(`${url.origin}/${makeFullUrlPart(fullUrl, pShare)}`, 302);
        }

        // =================【/hid 与 /uhm 加密分发模块】=================
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
            let registryResult = parseRefRegistry(fullUrl);
            let routingPayload = registryResult ? `${registryResult.shortName}/${registryResult.ID}` : makeFullUrlPart(fullUrl, pShare).substring(1);

            let encryptedPayload = btoa(routingPayload).replace(/=/g, '');
            if (cryptoMode > 0) encryptedPayload = await encryptStealthText(encryptedPayload, CONFIG.STEALTH_KEY, cryptoMode);

            let outPrefix = (cryptoMode === 0) ? pDcb : pUem[cryptoMode - 1];
            return Response.redirect(`${url.origin}/${outPrefix}/${encryptedPayload}/${encodeURIComponent(binaryName)}`, 302);
        }

        // =================【核心解密/别名中转落地还原】=================
        let workingPath = url.pathname;
        let incomingBinaryName = parseBinaryName(url.pathname); 

        // 1. 还原加密路径
        let uemIdx = pUem.findIndex(p => url.pathname.startsWith('/' + p + '/'));
        if (uemIdx !== -1 || url.pathname.startsWith('/' + pDcb + '/')) {
            const isDcb = url.pathname.startsWith('/' + pDcb + '/');
            const prefix = isDcb ? pDcb : pUem[uemIdx];
            let rawPart = url.pathname.substring(prefix.length + 2);
            let cryptPart = rawPart.split('/')[0];

            let decryptedB64 = isDcb ? cryptPart : await decryptStealthText(cryptPart, CONFIG.STEALTH_KEY, uemIdx + 1);
            if (!decryptedB64) return new Response("Forbidden: Invalid Crypto Stream", { status: 403 });
            try { workingPath = '/' + atob(decryptedB64).trim(); } catch { return new Response("Forbidden: Corrupted Payload", { status: 403 }); }
        }

        // 2. 还原短路径别名映射（/gis/${ID} 或 /pas/${ID}）
        let activeAlias = REFINING_REGISTRY.find(site => workingPath.startsWith(site.aliasPrefix + '/'));
        if (activeAlias) {
            let targetID = workingPath.substring(activeAlias.aliasPrefix.length + 1).split('/')[0];
            workingPath = '/' + pShare + '/' + activeAlias.ref_URL.replace('://', '/') + targetID;
        }

        // 3. 还原精炼模式映射（/simp/https/...）
        if (workingPath.startsWith('/' + pSimp + '/')) {
            workingPath = '/' + pShare + workingPath.substring(pSimp.length + 1);
        }

        // 判定准入
        if (!workingPath.startsWith('/' + pShare + '/')) return new Response("Forbidden: Access Denied", { status: 403 });

        // =================【核心分流：原生 dis 模式 vs 精简代理模式】=================
        let pureUpstreamPath = workingPath.substring(pShare.length + 2);
        
        // 剥离末尾挂着的 image.xxx 后缀，从而暴露出干净的源站直链
        if (/\/(image\.[a-z0-9]+)$/i.test(pureUpstreamPath)) {
            pureUpstreamPath = pureUpstreamPath.substring(0, pureUpstreamPath.lastIndexOf('/'));
        }

        // 原生普通 /dis 模式的分支进入判定
        let isNativeDisMode = url.pathname.startsWith('/' + pShare + '/');

        if (!isNativeDisMode) {
            // 如果是非普通模式（即：经过加密、精简或别名还原出来的链接），为了完美防404，对包含 /raw/ 的 Gist/Pastebin 裁剪前 4 段长尾
            let parts = pureUpstreamPath.split('/');
            if (parts.length > 3 && (pureUpstreamPath.includes('gist.githubusercontent.com/raw') || pureUpstreamPath.includes('pastebin.com/raw'))) {
                pureUpstreamPath = parts.slice(0, 4).join('/');
            }
        }

        // 组装最终发向上游源站的直链
        let upstreamUrl = null;
        try { upstreamUrl = new URL(pureUpstreamPath.replace(/^https?[:\/]+/i, 'https://')); } catch { return new Response("Invalid Upstream Target", { status: 400 }); }

        // 发起 Fetch 请求
        const cache = caches.default, cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) { const cachedResponse = await cache.match(cacheKey); if (cachedResponse) return cachedResponse; }

        const fetchHeaders = new Headers();
        fetchHeaders.set('User-Agent', request.headers.get('User-Agent') || 'Mozilla/5.0');
        let upstream = await fetch(upstreamUrl, { method: 'GET', headers: fetchHeaders, redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: ${upstream.status}`, { status: upstream.status });

        // 魔数探测
        const previewStream = upstream.clone(), reader = previewStream.body.getReader(), { value } = await reader.read();
        const chunkText = new TextDecoder().decode(value).trim().substring(0, 30).replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
        let matchedMeta = MAGIC_REGISTRY.find(item => item.b64_prefix && chunkText.startsWith(item.b64_prefix)) || MAGIC_REGISTRY[MAGIC_REGISTRY.length - 1];

        // =================【图片/二进制 终极分发规则】=================
        if (matchedMeta.isImage) {
            let expectedTail = `image.${matchedMeta.ext}`;
            if (!url.pathname.toLowerCase().endsWith('/' + expectedTail)) {
                
                if (isNativeDisMode) {
                    // 原生普通 dis 模式：怎么进就怎么出！只把 https:// 规范修正为 https/，末尾直接追加 /image.ext
                    let currentUrlPath = url.pathname.replace(/\/+$/, '');
                    if (currentUrlPath.includes('://')) {
                        currentUrlPath = currentUrlPath.replace(/^https?:\/\/[^\/]+\/dis\//i, '').replace('://', '/');
                        return Response.redirect(`${url.origin}/${pShare}/${currentUrlPath}/${expectedTail}`, 302);
                    }
                    return Response.redirect(currentUrlPath + '/' + expectedTail, 302);
                } else {
                    // 精炼/别名/加密模式：把多余的原文件名尾巴(如 Snipaste_xxx.jpg.b64)彻底剥离摘除，干净地重定向到 /image.ext
                    let urlParts = request.url.replace(/\/+$/, '').split('/');
                    let lastPart = urlParts[urlParts.length - 1];
                    if (lastPart.toLowerCase().endsWith('.b64') || lastPart.toLowerCase().endsWith('.base64') || lastPart.toLowerCase().startsWith('image.')) {
                        urlParts.pop(); // 完美剔除多余的源文件名长尾巴
                    }
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
        } else {
            // 否 > 落地页非图片流数据还原
            let finalDownloadName = incomingBinaryName;
            if (!finalDownloadName || finalDownloadName === 'raw' || finalDownloadName.startsWith('image.')) {
                finalDownloadName = parseBinaryName(workingPath);
            }

            finalDownloadName = deepDecode(finalDownloadName);
            let lowerName = finalDownloadName.toLowerCase();
            if (lowerName.endsWith('.b64')) finalDownloadName = finalDownloadName.slice(0, -4);
            else if (lowerName.endsWith('.base64')) finalDownloadName = finalDownloadName.slice(0, -7);
            
            if (!finalDownloadName || finalDownloadName === 'raw') finalDownloadName = matchedMeta.fallbackName;

            if (CONFIG.ALLOW_FALLBACK_DOWNLOAD !== 1) return new Response("Forbidden: Non-image blocked.", { status: 403 });
            return new Response(getFallbackDecoderHTML(await upstream.text(), finalDownloadName), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
    }
};

// 模块8：控制面板
function getPanelHTML() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CDN 极简中转站</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;background:#f4f6f9;color:#333;padding:20px;display:flex;flex-direction:column;align-items:center}.box{width:100%;max-width:650px;background:#fff;padding:20px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);margin-top:40px}input[type="text"]{width:100%;padding:14px;font-size:14px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;margin-bottom:15px;outline:none}input[type="text"]:focus{border-color:#409eff}.btn-row{display:flex;gap:12px}.btn{flex:1;padding:14px;font-size:14px;color:#fff;background:#409eff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;text-align:center;box-sizing:border-box}.btn:hover{background:#66b1ff}.btn-green{background:#67c23a}.btn-green:hover{background:#85ce61}.progress-wrapper{width:100%;background:#ebeef5;border-radius:10px;margin-top:15px;display:none;overflow:hidden;position:relative;height:18px}.progress-bar{height:100%;width:0%;background:#67c23a;transition:width 0.1s ease}.progress-text{position:absolute;width:100%;text-align:center;font-size:11px;font-weight:bold;color:#333;line-height:18px}</style></head><body><div class="box"><h3>CDN 极简中转控制面板</h3><input type="text" id="urlInput" placeholder="直接粘贴各种完整的 RAW URL..."><div class="btn-row"><button class="btn" id="btnGo">生成并跳转反代直链</button><button class="btn btn-green" id="btnPick">编码文件为Base64</button></div><div class="progress-wrapper" id="progressWrapper"><div class="progress-bar" id="progressBar"></div><div class="progress-text" id="progressText">准备编码... 0%</div></div><input type="file" id="fileFile" style="display:none"></div><script>const SHARE_PREFIX="${CONFIG.SHARE_PREFIX}",DEBUG_MODE=${CONFIG.DEBUG_MODE},FRONTEND_MAX_SIZE_KB=${CONFIG.FRONTEND_MAX_SIZE_KB};document.getElementById('btnGo').onclick=function(e){if(e){e.preventDefault();e.stopPropagation()}const v=document.getElementById('urlInput').value.trim();if(!v){alert("请输入外链！");return false}let c=v;if(/^https?:\\/\\//i.test(c)){c=c.replace(/^https?:\\/\\//i,m=>m.toLowerCase().replace('://','/'))}else if(!/^https?\\//i.test(c)){c='https/'+c}const j=window.location.origin+SHARE_PREFIX+'/'+c;if(DEBUG_MODE===1){window.location.href=j}else{window.open(j,'_blank')}return false};document.getElementById('btnPick').onclick=function(){document.getElementById('fileFile').click()};document.getElementById('fileFile').onchange=function(){if(this.files.length===0)return;const f=this.files[0];if(f.size>FRONTEND_MAX_SIZE_KB*1024){alert("超大限制");this.value="";return}const w=document.getElementById('progressWrapper'),b=document.getElementById('progressBar'),t=document.getElementById('progressText');w.style.display='block';b.style.width='0%';t.textContent="初始化...";const s=1024*256;let o=0,bin="";const r=()=>{const reader=new FileReader(),blob=f.slice(o,o+s);reader.onload=function(e){const bytes=new Uint8Array(e.target.result);let ch="";for(let i=0;i<bytes.length;i++)ch+=String.fromCharCode(bytes[i]);bin+=ch;o+=s;let p=Math.min(100,Math.floor((o/f.size)*100));b.style.width=p+'%';t.textContent="编码中: "+p+"%";if(o<f.size){setTimeout(r,1)}else{t.textContent="正在打包...";setTimeout(()=>{try{const res=btoa(bin),out=new Blob([res],{type:"text/plain;charset=utf-8"}),u=URL.createObjectURL(out),a=document.createElement('a');a.href=u;a.download=f.name+".b64";document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);t.textContent="成功！"}catch(err){t.textContent="异常"}finally{document.getElementById('fileFile').value="";setTimeout(()=>{w.style.display='none'},3000)}},50)}};reader.readAsArrayBuffer(blob)};r()};</script></body></html>`;
}

// 模块9：落地页
function getFallbackDecoderHTML(rawPayload, cleanFileName) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>正在落地资产...</title><style>body{font-family:sans-serif;background:#f4f6f9;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}.card{background:#fff;padding:30px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.1);text-align:center;width:100%;max-width:440px;box-sizing:border-box}.progress-wrapper{width:100%;background:#ebeef5;border-radius:10px;margin-top:20px;overflow:hidden;position:relative;height:18px}.progress-bar{height:100%;width:0%;background:#e6a23c;transition:width 0.1s ease}.progress-text{position:absolute;width:100%;left:0;top:0;text-align:center;font-size:11px;font-weight:bold;color:#333;line-height:18px}</style></head><body><div class="card"><h3 id="statusTitle" style="color:#e6a23c">正在落地通用数据流</h3><p style="font-size:13px;font-weight:bold;word-break:break-all">${cleanFileName}</p><div class="progress-wrapper"><div class="progress-bar" id="progressBar"></div><div class="progress-text" id="progressText">准备... 0%</div></div></div><script>(function(){const bar=document.getElementById('progressBar'),txt=document.getElementById('progressText'),title=document.getElementById('statusTitle');try{const raw= \`${rawPayload.replace(/[`\\$]/g, '\\$&')}\`.replace(/[\\r\\n\\s\\t]+/g,'').replace(/^data:[^,]+,/,''),tot=raw.length;let bin="",o=0;const s=1024*512,d=()=>{const seg=raw.substring(o,o+s);bin+=atob(seg);o+=s;let p=Math.min(100,Math.floor((o/tot)*100));bar.style.width=p+'%';txt.textContent="解码中: "+p+"%";if(o<tot){setTimeout(d,1)}else{txt.textContent="正在装配...";setTimeout(()=>{const len=bin.length,bytes=new Uint8Array(len);for(let i=0;i<len;i++)bytes[i]=bin.charCodeAt(i);const blob=new Blob([bytes.buffer],{type:"application/octet-stream"}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=\`${cleanFileName}\`;document.body.appendChild(a);a.click();setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(u);if(${CONFIG.DEBUG_MODE}!==1){window.close()}else{bar.style.backgroundColor='#67c23a';title.textContent='下载完成';title.style.color='#67c23a';txt.textContent="100%";}},800)},50)}};d()}catch(e){txt.textContent="故障"}})();</script></body></html>`;
}