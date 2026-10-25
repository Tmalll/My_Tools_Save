// 模块1：全局核心参数配置
const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD',
    SHARE_PREFIX: '/dis',
    REFINING_PREFIX: '/ref',
    ShortName_PREFIX: '/sho',
    hide64_PREFIX: '/hid',
    DECODE_B64_PREFIX: '/dcb',
    UHM_PREFIX_1: '/uhm1', UHM_OUTPUT_1: '/uem1', // Mode 1: Base64URL
    UHM_PREFIX_2: '/uhm2', UHM_OUTPUT_2: '/uem2', // Mode 2: HEX
    UHM_PREFIX_3: '/uhm3', UHM_OUTPUT_3: '/uem3', // Mode 3: Deflate + Base64URL
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

// 模块3：全量高兼容性第三方 Raw 托管源站配置表
const REFINING_REGISTRY = [
    {
        name: "GIST", shortName: "gis", aliasPrefix: "/gis", ref_URL: "https://gist.githubusercontent.com/raw/",
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
        name: "PASTEBIN", shortName: "pas", aliasPrefix: "/pas", ref_URL: "https://pastebin.com/raw/",
        match_group: [
            { regex: /pastebin\.com\/raw\/([a-zA-Z0-9]{8})/i, hasFile: false },
            { regex: /pastebin\.com\/([a-zA-Z0-9]{8})/i, hasFile: false }
        ],
        toRaw: (id) => `https://pastebin.com/raw/${id}`
    }
];

// =================【函数一：纯粹获取文件名函数】=================
function parseBinaryName(urlStr) {
    if (!urlStr) return "";
    let cleanUrl = urlStr.trim().replace(/\/+$/, '');
    let lastSlashIdx = cleanUrl.lastIndexOf('/');
    if (lastSlashIdx === -1) return decodeURIComponent(cleanUrl);
    let name = cleanUrl.substring(lastSlashIdx + 1);
    return decodeURIComponent(name.replace(/[\?#].*$/, ''));
}

// =================【函数二：注册表筛选链接函数】=================
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

// 规范化标准的反代完整路径变量 ${full_URL}
function makeFullUrlPart(urlStr, pShare) {
    let c = urlStr.trim();
    if (/^https?:\/\//i.test(c)) {
        c = c.replace(/^https?:\/\//i, m => m.toLowerCase().replace('://', '/'));
    } else if (!/^https?\//i.test(c)) {
        c = 'https/' + c;
    }
    return `${pShare}/${c}`;
}

// 模块6：高强度密码学加解密与多策略压缩
async function getStealthCryptoContext(seed) {
    const enc = new TextEncoder(), hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(seed)), hashArray = new Uint8Array(hashBuffer);
    const keyKey = await crypto.subtle.importKey('raw', hashArray.subarray(0, 16), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    return { key: keyKey, iv: hashArray.subarray(16, 28) };
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

// 模块7：Workers 路由控制与网络代理核心逻辑
export default {
    async fetch(request, env, ctx) {
        const realProto = request.headers.get("x-real-scheme"), realHost = request.headers.get("x-real-host");
        if (realProto && realHost) {
            const u = new URL(request.url);
            request = new Request(`${realProto}://${realHost}${u.pathname}${u.search}${u.hash}`, { method: request.method, headers: request.headers, body: request.method === "GET" || request.method === "HEAD" ? null : request.body, redirect: "manual" });
        }
        const url = new URL(request.url), 
              pAdmin = CONFIG.AUTH_PREFIX.replace(/^\/|\/$/g, ''), pShare = CONFIG.SHARE_PREFIX.replace(/^\/|\/$/g, ''), 
              pRef = CONFIG.REFINING_PREFIX.replace(/^\/|\/$/g, ''), pSho = CONFIG.ShortName_PREFIX.replace(/^\/|\/$/g, ''), 
              pHid = CONFIG.hide64_PREFIX.replace(/^\/|\/$/g, ''), pDcb = CONFIG.DECODE_B64_PREFIX.replace(/^\/|\/$/g, ''), 
              pUhm = [CONFIG.UHM_PREFIX_1, CONFIG.UHM_PREFIX_2, CONFIG.UHM_PREFIX_3].map(p => p.replace(/^\/|\/$/g, '')),
              pUem = [CONFIG.UHM_OUTPUT_1, CONFIG.UHM_OUTPUT_2, CONFIG.UHM_OUTPUT_3].map(p => p.replace(/^\/|\/$/g, ''));

        if (['/favicon.ico', '/apple-touch-icon.png', '/site.webmanifest'].some(p => url.pathname.toLowerCase().startsWith(p))) return new Response(null, { status: 204 });
        if (url.pathname === '/' + pAdmin || url.pathname === '/' + pAdmin + '/') return new Response(getPanelHTML(), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

        // =================【/ref 模块逻辑】=================
        if (url.pathname.startsWith('/' + pRef + '/')) {
            let remain = url.pathname.substring(pRef.length + 2) + url.search + url.hash;
            let fullUrl = remain.replace(/^https?[:\/]+/i, 'https://');
            if (remain.startsWith('http/')) fullUrl = remain.replace(/^http[:\/]+/i, 'http://');

            let binaryName = parseBinaryName(fullUrl);
            let registryResult = parseRefRegistry(fullUrl);

            if (registryResult) {
                // 拼接上明文尾巴变量 ${BinaryName} 供下游提取文件名，不丢失任何上下文
                return Response.redirect(`${url.origin}/${pShare}/${registryResult.ref_URL.replace('://', '/')}/${encodeURIComponent(binaryName)}`, 302);
            } else {
                return Response.redirect(`${url.origin}/${makeFullUrlPart(fullUrl, pShare)}`, 302);
            }
        }

        // =================【/sho 模块逻辑】=================
        if (url.pathname.startsWith('/' + pSho + '/')) {
            let remain = url.pathname.substring(pSho.length + 2) + url.search + url.hash;
            let fullUrl = remain.replace(/^https?[:\/]+/i, 'https://');
            if (remain.startsWith('http/')) fullUrl = remain.replace(/^http[:\/]+/i, 'http://');

            let binaryName = parseBinaryName(fullUrl);
            let registryResult = parseRefRegistry(fullUrl);
            if (registryResult) {
                // 在注册表内 > 完美输出携带明文尾巴的文件名短路由：${GIS}/${ID}/${BinaryName}
                return Response.redirect(`${url.origin}${registryResult.aliasPrefix}/${registryResult.ID}/${encodeURIComponent(binaryName)}`, 302);
            } else {
                return Response.redirect(`${url.origin}/${makeFullUrlPart(fullUrl, pShare)}`, 302);
            }
        }

        // =================【/hid 与 /uhm1/2/3 加密分发逻辑】=================
        let cryptoMode = -1, cryptoPrefix = "";
        if (url.pathname.startsWith('/' + pHid + '/')) { cryptoMode = 0; cryptoPrefix = pHid; }
        else {
            const idx = pUhm.findIndex(p => url.pathname.startsWith('/' + p + '/'));
            if (idx !== -1) { cryptoMode = idx + 1; cryptoPrefix = pUhm[idx]; }
        }

        if (cryptoMode >= 0) {
            let remain = url.pathname.substring(cryptoPrefix.length + 2) + url.search + url.hash;
            let fullUrl = remain.replace(/^https?[:\/]+/i, 'https://');
            if (remain.startsWith('http/')) fullUrl = remain.replace(/^http[:\/]+/i, 'http://');

            let binaryName = parseBinaryName(fullUrl);
            let registryResult = parseRefRegistry(fullUrl);
            let routingPayload = "";

            if (registryResult) {
                routingPayload = `${registryResult.shortName}/${registryResult.ID}`;
            } else {
                routingPayload = makeFullUrlPart(fullUrl, pShare).substring(1);
            }

            let encryptedPayload = btoa(routingPayload).replace(/=/g, '');
            if (cryptoMode > 0) {
                encryptedPayload = await encryptStealthText(encryptedPayload, CONFIG.STEALTH_KEY, cryptoMode);
            }

            let outPrefix = (cryptoMode === 0) ? pDcb : pUem[cryptoMode - 1];
            // 加密数据只包装核心链接，将明文尾巴挂载在外面，确保最终下载文件名的绝对原汁原味
            return Response.redirect(`${url.origin}/${outPrefix}/${encryptedPayload}/${encodeURIComponent(binaryName)}`, 302);
        }

        // =================【统一落地请求入口（解密、别名还原与请求剥离）】=================
        let workingPath = url.pathname;
        let incomingBinaryName = parseBinaryName(url.pathname); // 优先提取当前浏览器 URL 的真实明文尾巴

        // 1. 解析加密的前端入口线
        let uemIdx = pUem.findIndex(p => url.pathname.startsWith('/' + p + '/'));
        if (uemIdx !== -1 || url.pathname.startsWith('/' + pDcb + '/')) {
            const isDcb = url.pathname.startsWith('/' + pDcb + '/');
            const prefix = isDcb ? pDcb : pUem[uemIdx];
            let rawPart = url.pathname.substring(prefix.length + 2);
            let cryptPart = rawPart.split('/')[0];

            let decryptedB64 = isDcb ? cryptPart : await decryptStealthText(cryptPart, CONFIG.STEALTH_KEY, uemIdx + 1);
            if (!decryptedB64) return new Response("Forbidden: Invalid Crypto Stream", { status: 403 });

            try {
                let decodedStr = atob(decryptedB64).trim();
                workingPath = '/' + decodedStr; // 转换为 /dis/https/... 或 /gis/id
            } catch { return new Response("Forbidden: Corrupted Payload", { status: 403 }); }
        }

        // 2. 统一拦截处理 /sho 模式带来的别名映射请求（如 /gis/${ID} 或 /pas/${ID}）
        let activeAlias = REFINING_REGISTRY.find(site => workingPath.startsWith(site.aliasPrefix + '/'));
        if (activeAlias) {
            let targetID = workingPath.substring(activeAlias.aliasPrefix.length + 1).split('/')[0];
            // 内部平滑重写为标准请求：/dis/https/gist.githubusercontent.com/raw/id
            workingPath = '/' + pShare + '/' + activeAlias.ref_URL.replace('://', '/') + targetID;
        }

        if (!workingPath.startsWith('/' + pShare + '/')) {
            return new Response("Forbidden: Access Denied", { status: 403 });
        }

        // 3. 核心提取：彻底清洗剥离一切伪装尾巴，还原最纯净的官方托管直链请求上游
        let pureUpstreamPath = workingPath.substring(pShare.length + 2);
        let parts = pureUpstreamPath.split('/');
        
        // 如果属于注册表服务（Gist / Pastebin）的长链接段，强行裁剪保留到前4段，获取纯 ID 直链！
        if (parts.length > 3 && (pureUpstreamPath.includes('gist.githubusercontent.com/raw') || pureUpstreamPath.includes('pastebin.com/raw'))) {
            pureUpstreamPath = parts.slice(0, 4).join('/');
        }

        let upstreamUrl = null;
        try { upstreamUrl = new URL(pureUpstreamPath.replace(/^https?[:\/]+/i, 'https://')); } catch { return new Response("Invalid Upstream Target", { status: 400 }); }

        // 发起拉取上游原始 Base64 数据
        const cache = caches.default, cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) { const cachedResponse = await cache.match(cacheKey); if (cachedResponse) return cachedResponse; }

        const fetchHeaders = new Headers();
        fetchHeaders.set('User-Agent', request.headers.get('User-Agent') || 'Mozilla/5.0');
        let upstream = await fetch(upstreamUrl, { method: 'GET', headers: fetchHeaders, redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: ${upstream.status}`, { status: upstream.status });

        // 读取上游前30个字符，根据魔数对资产类型进行核心判定
        const previewStream = upstream.clone(), reader = previewStream.body.getReader(), { value } = await reader.read();
        const chunkText = new TextDecoder().decode(value).trim().substring(0, 30).replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
        let matchedMeta = MAGIC_REGISTRY.find(item => item.b64_prefix && chunkText.startsWith(item.b64_prefix)) || MAGIC_REGISTRY[MAGIC_REGISTRY.length - 1];

        // =================【魔数落地判定与文件名拼装分发】=================
        if (matchedMeta.isImage) {
            // 是图片流程：尾巴挂上 /image.${ext}
            let expectedTail = `image.${matchedMeta.ext}`;
            if (!url.pathname.toLowerCase().endsWith('/' + expectedTail)) {
                let cleanRedirect = request.url.replace(/\/+$/, '');
                // 如果当前路径最后的元素不是预期的 image.ext，则切除不匹配的杂质后缀并重定向到正确的图片呈现地址
                if (incomingBinaryName && incomingBinaryName !== expectedTail) {
                    cleanRedirect = cleanRedirect.substring(0, cleanRedirect.lastIndexOf('/'));
                }
                return Response.redirect(cleanRedirect + '/' + expectedTail, 302);
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
            // 否 > 走非图片流程：提取并还原真实文件名进行 HTML 落地下载
            let finalDownloadName = incomingBinaryName;
            
            // 如果提取出来的名字是注册表的系统词或被空串遮蔽，降级去纯净上游路径重新解析
            if (!finalDownloadName || finalDownloadName === 'raw' || finalDownloadName.startsWith('uem') || finalDownloadName.startsWith('dcb')) {
                finalDownloadName = parseBinaryName(workingPath);
            }

            let lowerName = finalDownloadName.toLowerCase();
            // 在此落地的那一刻剔除 .b64 或 .base64 后缀包装
            if (lowerName.endsWith('.b64')) finalDownloadName = finalDownloadName.slice(0, -4);
            else if (lowerName.endsWith('.base64')) finalDownloadName = finalDownloadName.slice(0, -7);
            
            if (!finalDownloadName || finalDownloadName === 'raw') finalDownloadName = matchedMeta.fallbackName;

            if (CONFIG.ALLOW_FALLBACK_DOWNLOAD !== 1) return new Response("Forbidden: Non-image asset types are blocked.", { status: 403 });
            return new Response(getFallbackDecoderHTML(await upstream.text(), finalDownloadName), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
    }
};

// 模块8：前端后台管理控制面板页面模板
function getPanelHTML() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CDN 极简中转站</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;background:#f4f6f9;color:#333;padding:20px;display:flex;flex-direction:column;align-items:center}.box{width:100%;max-width:650px;background:#fff;padding:20px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);margin-top:40px}input[type="text"]{width:100%;padding:14px;font-size:14px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;margin-bottom:15px;outline:none}input[type="text"]:focus{border-color:#409eff}.btn-row{display:flex;gap:12px}.btn{flex:1;padding:14px;font-size:14px;color:#fff;background:#409eff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;text-align:center;box-sizing:border-box}.btn:hover{background:#66b1ff}.btn-green{background:#67c23a}.btn-green:hover{background:#85ce61}.progress-wrapper{width:100%;background:#ebeef5;border-radius:10px;margin-top:15px;display:none;overflow:hidden;position:relative;height:18px}.progress-bar{height:100%;width:0%;background:#67c23a;transition:width 0.1s ease}.progress-text{position:absolute;width:100%;text-align:center;font-size:11px;font-weight:bold;color:#333;line-height:18px}</style></head><body><div class="box"><h3>CDN 极简中转控制面板</h3><input type="text" id="urlInput" placeholder="直接粘贴各种完整的 RAW URL..."><div class="btn-row"><button class="btn" id="btnGo">生成并跳转反代直链</button><button class="btn btn-green" id="btnPick">编码文件为Base64</button></div><div class="progress-wrapper" id="progressWrapper"><div class="progress-bar" id="progressBar"></div><div class="progress-text" id="progressText">准备编码... 0%</div></div><input type="file" id="fileFile" style="display:none"></div><script>const SHARE_PREFIX="${CONFIG.SHARE_PREFIX}",DEBUG_MODE=${CONFIG.DEBUG_MODE},FRONTEND_MAX_SIZE_KB=${CONFIG.FRONTEND_MAX_SIZE_KB};document.getElementById('btnGo').onclick=function(e){if(e){e.preventDefault();e.stopPropagation()}const v=document.getElementById('urlInput').value.trim();if(!v){alert("请输入外链！");return false}let c=v;if(/^https?:\\/\\//i.test(c)){c=c.replace(/^https?:\\/\\//i,m=>m.toLowerCase().replace('://','/'))}else if(!/^https?\\//i.test(c)){c='https/'+c}const j=window.location.origin+SHARE_PREFIX+'/'+c;if(DEBUG_MODE===1){window.location.href=j}else{window.open(j,'_blank')}return false};document.getElementById('btnPick').onclick=function(){document.getElementById('fileFile').click()};document.getElementById('fileFile').onchange=function(){if(this.files.length===0)return;const f=this.files[0];if(f.size>FRONTEND_MAX_SIZE_KB*1024){alert("超大限制");this.value="";return}const w=document.getElementById('progressWrapper'),b=document.getElementById('progressBar'),t=document.getElementById('progressText');w.style.display='block';b.style.width='0%';t.textContent="初始化...";const s=1024*256;let o=0,bin="";const r=()=>{const reader=new FileReader(),blob=f.slice(o,o+s);reader.onload=function(e){const bytes=new Uint8Array(e.target.result);let ch="";for(let i=0;i<bytes.length;i++)ch+=String.fromCharCode(bytes[i]);bin+=ch;o+=s;let p=Math.min(100,Math.floor((o/f.size)*100));b.style.width=p+'%';t.textContent="编码中: "+p+"%";if(o<f.size){setTimeout(r,1)}else{t.textContent="正在打包...";setTimeout(()=>{try{const res=btoa(bin),out=new Blob([res],{type:"text/plain;charset=utf-8"}),u=URL.createObjectURL(out),a=document.createElement('a');a.href=u;a.download=f.name+".b64";document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);t.textContent="成功！"}catch(err){t.textContent="异常"}finally{document.getElementById('fileFile').value="";setTimeout(()=>{w.style.display='none'},3000)}},50)}};reader.readAsArrayBuffer(blob)};r()};</script></body></html>`;
}

// 模块9：前端通用二进制流分块解码沙盒页面模板
function getFallbackDecoderHTML(rawPayload, cleanFileName) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>正在落地资产...</title><style>body{font-family:sans-serif;background:#f4f6f9;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}.card{background:#fff;padding:30px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.1);text-align:center;width:100%;max-width:440px;box-sizing:border-box}.progress-wrapper{width:100%;background:#ebeef5;border-radius:10px;margin-top:20px;overflow:hidden;position:relative;height:18px}.progress-bar{height:100%;width:0%;background:#e6a23c;transition:width 0.1s ease}.progress-text{position:absolute;width:100%;left:0;top:0;text-align:center;font-size:11px;font-weight:bold;color:#333;line-height:18px}</style></head><body><div class="card"><h3 id="statusTitle" style="color:#e6a23c">正在落地通用数据流</h3><p style="font-size:13px;font-weight:bold;word-break:break-all">${cleanFileName}</p><div class="progress-wrapper"><div class="progress-bar" id="progressBar"></div><div class="progress-text" id="progressText">准备... 0%</div></div></div><script>(function(){const bar=document.getElementById('progressBar'),txt=document.getElementById('progressText'),title=document.getElementById('statusTitle');try{const raw= \`${rawPayload.replace(/[`\\$]/g, '\\$&')}\`.replace(/[\\r\\n\\s\\t]+/g,'').replace(/^data:[^,]+,/,''),tot=raw.length;let bin="",o=0;const s=1024*512,d=()=>{const seg=raw.substring(o,o+s);bin+=atob(seg);o+=s;let p=Math.min(100,Math.floor((o/tot)*100));bar.style.width=p+'%';txt.textContent="解码中: "+p+"%";if(o<tot){setTimeout(d,1)}else{txt.textContent="正在装配...";setTimeout(()=>{const len=bin.length,bytes=new Uint8Array(len);for(let i=0;i<len;i++)bytes[i]=bin.charCodeAt(i);const blob=new Blob([bytes.buffer],{type:"application/octet-stream"}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download="${cleanFileName}";document.body.appendChild(a);a.click();setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(u);if(${CONFIG.DEBUG_MODE}!==1){window.close()}else{bar.style.backgroundColor='#67c23a';title.textContent='下载完成';title.style.color='#67c23a';txt.textContent="100%";}},800)},50)}};d()}catch(e){txt.textContent="故障"}})();</script></body></html>`;
}