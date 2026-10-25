// CF_Workers_万能图片反代脚本 (纯净图片版)

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
    BACKEND_MAX_SIZE_KB: 10240,
    ALLOW_BACKEND_CHUNKED_RAW: 1,
    FRONTEND_MAX_SIZE_KB: 15360
};

// 模块2：魔数映射注册表 (严格限制为合法的 Web 图片格式)
const MAGIC_REGISTRY = [
    { b64_prefix: "iVBORw", mime: "image/png",     ext: "png"  },
    { b64_prefix: "/9j/",   mime: "image/jpeg",    ext: "jpg"  },
    { b64_prefix: "R0lGOD", mime: "image/gif",     ext: "gif"  },
    { b64_prefix: "UklGR",  mime: "image/webp",    ext: "webp" },
    { b64_prefix: "AAAAIG", mime: "image/avif",    ext: "avif" },
    { b64_prefix: "PHN2Zy", mime: "image/svg+xml", ext: "svg"  },
    { b64_prefix: "AAABAA", mime: "image/x-icon",  ext: "ico"  },
    { b64_prefix: "Qk0",    mime: "image/bmp",     ext: "bmp"  },
    { b64_prefix: "SUkq",   mime: "image/tiff",    ext: "tiff" },
    { b64_prefix: "TU0A",   mime: "image/tiff",    ext: "tiff" }
];

// 支持透传的原始图片 Content-Type 白名单
const RAW_IMAGE_MIME_WHITELIST = [
    "image/jpeg", "image/png", "image/webp", "image/gif", 
    "image/avif", "image/svg+xml", "image/x-icon", "image/bmp"
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

const REFINING_REGISTRY = [
    {
        name: "GIST", shortName: "gis", aliasPrefix: "/gis", ref_URL: "https://gist.githubusercontent.com/raw/",
        match_group: [
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/[0-9a-f]{40}\/([^\/\?#]+)/i },
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/([^\/\?#]+)/i },
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})\/raw/i },
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})/i },
            { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})\/raw\/0-9a-f]{40}\/([^\/\?#]+)/i },
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
    if (registryResult && registryResult.ID && name === registryResult.ID) {
        return "";
    }
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

        // =================【路由重定向分发模块】=================
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

        if (url.pathname.startsWith('/' + pSho + '/')) {
            let remain = url.pathname.substring(pSho.length + 2) + url.search + url.hash;
            let fullUrl = remain.replace(/^https?[:\/]+/i, 'https://').replace('http/', 'http://');
            let binaryName = parseBinaryName(fullUrl);
            let registryResult = parseRefRegistry(fullUrl);
            if (registryResult) {
                let tail = binaryName ? `/${encodeURIComponent(binaryName)}` : '';
                return Response.redirect(`${url.origin}${registryResult.aliasPrefix}/${registryResult.ID}${tail}`, 302);
            }
            return Response.redirect(`${url.origin}/${makeFullUrlPart(fullUrl, pShare)}`, 302);
        }

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
            let tail = binaryName ? `/${encodeURIComponent(binaryName)}` : '';
            return Response.redirect(`${url.origin}/${outPrefix}/${encryptedPayload}${tail}`, 302);
        }

        // =================【核心解密/别名中转落地还原】=================
        let workingPath = url.pathname;

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

        let activeAlias = REFINING_REGISTRY.find(site => workingPath.startsWith(site.aliasPrefix + '/'));
        if (activeAlias) {
            let targetID = workingPath.substring(activeAlias.aliasPrefix.length + 1).split('/')[0];
            workingPath = '/' + pShare + '/' + activeAlias.ref_URL.replace('://', '/') + targetID;
        }

        if (workingPath.startsWith('/' + pSimp + '/')) {
            workingPath = '/' + pShare + workingPath.substring(pSimp.length + 1);
        }

        if (!workingPath.startsWith('/' + pShare + '/')) return new Response("Forbidden: Access Denied", { status: 403 });

        let isNativeDisMode = url.pathname.startsWith('/' + pShare + '/');

        if (isNativeDisMode && url.pathname.includes('://')) {
            let currentUrlPath = url.pathname.replace(/\/+$/, '');
            currentUrlPath = currentUrlPath.replace(/^https?:\/\/[^\/]+\/dis\//i, '').replace('://', '/');
            let cleanPath = `/${pShare}/${currentUrlPath}`.replace(/\/+/g, '/').replace(/^\/dis\/dis\//i, '/dis/');
            return Response.redirect(`${url.origin}${cleanPath}${url.search}${url.hash}`, 302);
        }

        let pureUpstreamPath = workingPath.substring(pShare.length + 2);
        
        if (/\/(image\.[a-z0-9]+)$/i.test(pureUpstreamPath)) {
            pureUpstreamPath = pureUpstreamPath.substring(0, pureUpstreamPath.lastIndexOf('/'));
        }

        if (!isNativeDisMode) {
            let parts = pureUpstreamPath.split('/');
            if (parts.length > 3 && (pureUpstreamPath.includes('gist.githubusercontent.com/raw') || pureUpstreamPath.includes('pastebin.com/raw'))) {
                pureUpstreamPath = parts.slice(0, 4).join('/');
            }
        }

        let upstreamUrl = null;
        try { upstreamUrl = new URL(pureUpstreamPath.replace(/^https?[:\/]+/i, 'https://')); } catch { return new Response("Invalid Upstream Target", { status: 400 }); }

        // 发起 Fetch 请求
        const cache = caches.default, cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) { const cachedResponse = await cache.match(cacheKey); if (cachedResponse) return cachedResponse; }

        const fetchHeaders = new Headers();
        fetchHeaders.set('User-Agent', request.headers.get('User-Agent') || 'Mozilla/5.0');
        let upstream = await fetch(upstreamUrl, { method: 'GET', headers: fetchHeaders, redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: ${upstream.status}`, { status: upstream.status });

        // =================【核心优化：多重机制过滤非图片资产】=================
        
        // 1. 检查源站直链响应的 Content-Type 头部（如果是标准 Web 图片流则直接白名单放行透传）
        const upstreamContentType = upstream.headers.get("Content-Type") || "";
        const cleanMime = upstreamContentType.split(';')[0].trim().toLowerCase();
        
        if (RAW_IMAGE_MIME_WHITELIST.includes(cleanMime)) {
            const respHeaders = new Headers(upstream.headers);
            respHeaders.set("Access-Control-Allow-Origin", "*");
            respHeaders.set("Cache-Control", CONFIG.DEBUG_MODE === 1 ? "no-store" : `public, max-age=${CONFIG.CACHE_TTL}`);
            
            const response = new Response(upstream.body, { status: 200, headers: respHeaders });
            if (CONFIG.DEBUG_MODE !== 1) ctx.waitUntil(cache.put(cacheKey, response.clone()));
            return response;
        }

        // 2. 针对 Base64 纯文本进行魔数探测
        const previewStream = upstream.clone(), reader = previewStream.body.getReader(), { value } = await reader.read();
        if (!value) return new Response("Forbidden: Empty Stream", { status: 403 });
        
        const chunkText = new TextDecoder().decode(value).trim().substring(0, 30).replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
        let matchedMeta = MAGIC_REGISTRY.find(item => item.b64_prefix && chunkText.startsWith(item.b64_prefix));

        // 如果既不是原始图片格式，在 Base64 注册表中也查无此魔数，直接拦截 403
        if (!matchedMeta) {
            return new Response("Forbidden: Non-image or unsupported assets blocked.", { status: 403 });
        }

        // 3. 处理 Base64 图片数据的正常反代逻辑
        let expectedTail = `image.${matchedMeta.ext}`;
        if (!url.pathname.toLowerCase().endsWith('/' + expectedTail)) {
            if (isNativeDisMode) {
                let currentUrlPath = url.pathname.replace(/\/+$/, '');
                let cleanPath = `/${pShare}/${currentUrlPath}`.replace(/\/+/g, '/').replace(/^\/dis\/dis\//i, '/dis/');
                return Response.redirect(`${url.origin}${cleanPath}/${expectedTail}`, 302);
            } else {
                let urlParts = request.url.replace(/\/+$/, '').split('/');
                let lastPart = urlParts[urlParts.length - 1];
                if (lastPart.toLowerCase().endsWith('.b64') || lastPart.toLowerCase().endsWith('.base64') || lastPart.toLowerCase().startsWith('image.')) {
                    urlParts.pop(); 
                }
                return Response.redirect(urlParts.join('/') + '/' + expectedTail, 302);
            }
        }

        try {
            let cleaned = (await upstream.text()).replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
            const mod = cleaned.length % 4; if (mod > 1) cleaned += "=".repeat(4 - mod);
            const binary = atob(cleaned), bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            
            const respHeaders = new Headers({ 
                "Access-Control-Allow-Origin": "*", 
                "Content-Type": matchedMeta.mime, 
                "Content-Disposition": `inline; filename="image.${matchedMeta.ext}"`, 
                "Cache-Control": CONFIG.DEBUG_MODE === 1 ? "no-store" : `public, max-age=${CONFIG.CACHE_TTL}` 
            });
            const response = new Response(bytes.buffer, { status: 200, headers: respHeaders });
            if (CONFIG.DEBUG_MODE !== 1) ctx.waitUntil(cache.put(cacheKey, response.clone()));
            return response;
        } catch (e) { 
            return new Response(`Decoder Exception: ${e.message}`, { status: 500 }); 
        }
    }
};

// 模块8：控制面板
function getPanelHTML() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CDN 纯净图片中转站</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;background:#f4f6f9;color:#333;padding:20px;display:flex;flex-direction:column;align-items:center}.box{width:100%;max-width:650px;background:#fff;padding:20px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);margin-top:40px}input[type="text"]{width:100%;padding:14px;font-size:14px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;margin-bottom:15px;outline:none}input[type="text"]:focus{border-color:#409eff}.btn-row{display:flex;gap:12px}.btn{flex:1;padding:14px;font-size:14px;color:#fff;background:#409eff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;text-align:center;box-sizing:border-box}.btn:hover{background:#66b1ff}.btn-green{background:#67c23a}.btn-green:hover{background:#85ce61}.progress-wrapper{width:100%;background:#ebeef5;border-radius:10px;margin-top:15px;display:none;overflow:hidden;position:relative;height:18px}.progress-bar{height:100%;width:0%;background:#67c23a;transition:width 0.1s ease}.progress-text{position:absolute;width:100%;text-align:center;font-size:11px;font-weight:bold;color:#333;line-height:18px}</style></head><body><div class="box"><h3>CDN 纯净图片中转控制面板</h3><input type="text" id="urlInput" placeholder="直接粘贴各种完整的图片或 Base64 RAW URL..."><div class="btn-row"><button class="btn" id="btnGo">生成并跳转反代直链</button><button class="btn btn-green" id="btnPick">图片转 Base64 编码</button></div><div class="progress-wrapper" id="progressWrapper"><div class="progress-bar" id="progressBar"></div><div class="progress-text" id="progressText">准备编码... 0%</div></div><input type="file" id="fileFile" accept="image/*" style="display:none"></div><script>const SHARE_PREFIX="${CONFIG.SHARE_PREFIX}",DEBUG_MODE=${CONFIG.DEBUG_MODE},FRONTEND_MAX_SIZE_KB=${CONFIG.FRONTEND_MAX_SIZE_KB};document.getElementById('btnGo').onclick=function(e){if(e){e.preventDefault();e.stopPropagation()}const v=document.getElementById('urlInput').value.trim();if(!v){alert("请输入外链！");return false}let c=v;if(/^https?:\\/\\//i.test(c)){c=c.replace(/^https?:\\/\\//i,m=>m.toLowerCase().replace('://','/'))}else if(!/^https?\\//i.test(c)){c='https/'+c}const j=window.location.origin+SHARE_PREFIX+'/'+c;if(DEBUG_MODE===1){window.location.href=j}else{window.open(j,'_blank')}return false};document.getElementById('btnPick').onclick=function(){document.getElementById('fileFile').click()};document.getElementById('fileFile').onchange=function(){if(this.files.length===0)return;const f=this.files[0];if(f.size>FRONTEND_MAX_SIZE_KB*1024){alert("超大限制");this.value="";return}const w=document.getElementById('progressWrapper'),b=document.getElementById('progressBar'),t=document.getElementById('progressText');w.style.display='block';b.style.width='0%';t.textContent="初始化...";const s=1024*256;let o=0,bin="";const r=()=>{const reader=new FileReader(),blob=f.slice(o,o+s);reader.onload=function(e){const bytes=new Uint8Array(e.target.result);let ch="";for(let i=0;i<bytes.length;i++)ch+=String.fromCharCode(bytes[i]);bin+=ch;o+=s;let p=Math.min(100,Math.floor((o/f.size)*100));b.style.width=p+'%';t.textContent="编码中: "+p+"%";if(o<f.size){setTimeout(r,1)}else{t.textContent="正在打包...";setTimeout(()=>{try{const res=btoa(bin),out=new Blob([res],{type:"text/plain;charset=utf-8"}),u=URL.createObjectURL(out),a=document.createElement('a');a.href=u;a.download=f.name+".b64";document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);t.textContent="成功！"}catch(err){t.textContent="异常"}finally{document.getElementById('fileFile').value="";setTimeout(()=>{w.style.display='none'},3000)}},50)}};reader.readAsArrayBuffer(blob)};r()};</script></body></html>`;
}