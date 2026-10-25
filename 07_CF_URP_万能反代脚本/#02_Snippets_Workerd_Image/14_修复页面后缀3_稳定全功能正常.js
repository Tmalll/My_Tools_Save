const BASE_AUTH_PREFIX = '';
const CONFIG = {
    HOME_PAGE_PREFIX: `${BASE_AUTH_PREFIX}/home`,
    SHARE_PREFIX: `${BASE_AUTH_PREFIX}/dis`,
    REFINING_PREFIX: `${BASE_AUTH_PREFIX}/ref`, REFINING_OUT_PREFIX: `${BASE_AUTH_PREFIX}/simp`, 
    ShortName_PREFIX: `${BASE_AUTH_PREFIX}/sho`,
    hide64_PREFIX: `${BASE_AUTH_PREFIX}/hid`, DECODE_B64_PREFIX: `${BASE_AUTH_PREFIX}/dcb`,
    UHM_PREFIX_1: `${BASE_AUTH_PREFIX}/uhm1`, UHM_OUTPUT_1: `${BASE_AUTH_PREFIX}/uem1`,
    UHM_PREFIX_2: `${BASE_AUTH_PREFIX}/uhm2`, UHM_OUTPUT_2: `${BASE_AUTH_PREFIX}/uem2`,
    UHM_PREFIX_3: `${BASE_AUTH_PREFIX}/uhm3`, UHM_OUTPUT_3: `${BASE_AUTH_PREFIX}/uem3`,
    STEALTH_KEY: 'Tmalll_Secret_Salt_2026',
    DEBUG_MODE: 1,
    CACHE_TTL: 2592000,
    FRONTEND_MAX_SIZE_KB: 15360,
    BACKEND_MAX_SIZE_KB: 10240,
    ALLOW_BACKEND_CHUNKED_RAW: 1
};
const MAGIC_REGISTRY = [
    { mime: "image/png",      ext: "png",  bytes: [0x89, 0x50, 0x4E, 0x47], b64: "iVBORw" },
    { mime: "image/jpeg",     ext: "jpg",  bytes: [0xFF, 0xD8, 0xFF],       b64: "/9j/"   },
    { mime: "image/gif",      ext: "gif",  bytes: [0x47, 0x49, 0x46, 0x38], b64: "R0lGOD" },
    { mime: "image/webp",     ext: "webp", bytes: [0x52, 0x49, 0x46, 0x46], b64: "UklGR"  },
    { mime: "image/x-icon",   ext: "ico",  bytes: [0x00, 0x00, 0x01, 0x00], b64: "AAABAA" },
    { mime: "image/bmp",      ext: "bmp",  bytes: [0x42, 0x4D],             b64: "Qk0"    },
    { mime: "image/svg+xml",  ext: "svg",  bytes: [0x3C, 0x3F, 0x78, 0x6D], b64: "PHN2Zy" },
    { mime: "image/svg+xml",  ext: "svg",  bytes: [0x3C, 0x73, 0x76, 0x67], b64: "PHN2Zy" },
    { mime: "image/avif",     ext: "avif", bytes: null,                     b64: "AAAAIG" }
];
const REFINING_REGISTRY = [
    {
        name: "GIST", shortName: `${BASE_AUTH_PREFIX}/gis`, aliasPrefix: `${BASE_AUTH_PREFIX}/gis`, ref_URL: "https://gist.githubusercontent.com/raw/",
        match_group: [
            { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})/i },
            { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})/i },
            { regex: /gist\.githubusercontent\.com\/raw\/([0-9a-f]{32})/i }
        ],
        toRaw: (id) => `https://gist.githubusercontent.com/raw/${id}`
    },
    {
        name: "PASTEBIN", shortName: `${BASE_AUTH_PREFIX}/pas`, aliasPrefix: `${BASE_AUTH_PREFIX}/pas`, ref_URL: "https://pastebin.com/raw/",
        match_group: [
            { regex: /pastebin\.com\/raw\/([a-zA-Z0-9]{8})/i },
            { regex: /pastebin\.com\/([a-zA-Z0-9]{8})/i }
        ],
        toRaw: (id) => `https://pastebin.com/raw/${id}`
    }
];
const encoder = new TextEncoder(), decoder = new TextDecoder();
const REGEX_HTTP = /^https?[:\/]+/i;
const REGEX_IMAGE_TAIL = /\/image\.[a-z0-9]+$/i;
function normalizeUrl(urlStr) {
    return urlStr.trim().replace(REGEX_HTTP, 'https://').replace('http/', 'http://').replace('https:/gist', 'https://gist');
}
function parseRefRegistry(urlStr) {
    if (!urlStr) return null;
    let cleanUrl = urlStr.trim();
    for (const site of REFINING_REGISTRY) {
        for (const item of site.match_group) {
            const match = cleanUrl.match(item.regex);
            if (match && match[1]) return { site, ID: match[1], ref_URL: site.toRaw(match[1]), shortName: site.shortName, aliasPrefix: site.aliasPrefix };
        }
    }
    return null;
}
function parseRouteContext(pathname, prefixLength, searchAndHash) {
    let remain = pathname.substring(prefixLength + 2) + searchAndHash;
    let fullUrl = normalizeUrl(remain);
    let cleanUrlForName = fullUrl.replace(/\/+$/, '');
    if (REGEX_IMAGE_TAIL.test(cleanUrlForName)) cleanUrlForName = cleanUrlForName.replace(REGEX_IMAGE_TAIL, '');
    let lastSlashIdx = cleanUrlForName.lastIndexOf('/');
    let name = lastSlashIdx === -1 ? cleanUrlForName : cleanUrlForName.substring(lastSlashIdx + 1);
    try { while (name.includes('%')) { let next = decodeURIComponent(name); if (next === name) break; name = next; } } catch {}
    name = name.replace(/[\?#].*$/, '');
    let registryResult = parseRefRegistry(fullUrl);
    if (registryResult && registryResult.ID && name === registryResult.ID) name = "";
    return { fullUrl, binaryName: name, registryResult, tail: name ? `/${encodeURIComponent(name)}` : '' };
}
function checkHasValidExt(pathStr) {
    let clean = pathStr.replace(/\/+$/, '').toLowerCase();
    if (REGEX_IMAGE_TAIL.test(clean)) return null;
    for (const item of MAGIC_REGISTRY) {
        if (clean.endsWith('.' + item.ext)) return item.ext;
    }
    if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'jpg';
    return null;
}
function makeFullUrlPart(urlStr, pShare) {
    let c = urlStr.trim();
    c = /^https?:\/\//i.test(c) ? c.replace(/^https?:\/\//i, m => m.toLowerCase().replace('://', '/')) : (!/^https?\//i.test(c) ? 'https/' + c : c);
    return `${pShare}/${c}`;
}
let cryptoCtxCache = null;
async function getStealthCryptoContext(seed) {
    if (cryptoCtxCache) return cryptoCtxCache;
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(seed)), hashArray = new Uint8Array(hashBuffer);
    cryptoCtxCache = { key: await crypto.subtle.importKey('raw', hashArray.subarray(0, 16), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']), iv: hashArray.subarray(16, 28) };
    return cryptoCtxCache;
}
function bytesToBase64Url(arr) { return btoa(String.fromCharCode(...new Uint8Array(arr))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }
function base64UrlToBytes(s) {
    const cleanS = s.replace(/-/g, '+').replace(/_/g, '/'), pad = (4 - (cleanS.length % 4)) % 4;
    const rawStr = atob(cleanS + "=".repeat(pad)), arr = new Uint8Array(rawStr.length);
    for (let i = 0; i < rawStr.length; i++) arr[i] = rawStr.charCodeAt(i);
    return arr.buffer;
}
async function encryptStealthText(plainText, seed, mode = 1) {
    let srcBytes = encoder.encode(plainText);
    if (mode === 3) {
        const cs = new CompressionStream('deflate'), writer = cs.writable.getWriter();
        writer.write(srcBytes); writer.close();
        srcBytes = new Uint8Array(await new Response(cs.readable).arrayBuffer());
    }
    const ctx = await getStealthCryptoContext(seed);
    const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ctx.iv }, ctx.key, srcBytes);
    return mode === 2 ? Array.from(new Uint8Array(encryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join('') : bytesToBase64Url(encryptedBuffer);
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
        return decoder.decode(decryptedBuffer);
    } catch { return null; }
}
function makeImageResponse(body, mime, isB64Ext, cacheKey, cache, ctx) {
    const respHeaders = new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": mime,
        "Cache-Control": CONFIG.DEBUG_MODE === 1 ? "no-store" : `public, max-age=${CONFIG.CACHE_TTL}`
    });
    if (isB64Ext) respHeaders.set("Content-Disposition", `inline; filename="image.${isB64Ext}"`);
    const response = new Response(body, { status: 200, headers: respHeaders });
    if (CONFIG.DEBUG_MODE !== 1) ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
}
async function probeTargetExt(targetUrl) {
    try {
        let res = await fetch(targetUrl, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: "follow" });
        if (res.status !== 200) return null;
        let reader = res.body.getReader(), { done, value } = await reader.read();
        if (done || !value) return null;
        for (const item of MAGIC_REGISTRY) {
            if (item.bytes && value.length >= item.bytes.length && item.bytes.every((b, i) => value[i] === b)) return item.ext;
        }
        if (res.headers.get("Content-Type")?.includes("avif")) {
            let chunk = decoder.decode(value.subarray(0, 30));
            if (chunk.includes("ftypavif") || chunk.includes("ftypavis")) return "avif";
        }
        let chunkText = decoder.decode(value.subarray(0, 45)).trim().substring(0, 30).replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
        let matchedMeta = MAGIC_REGISTRY.find(item => item.b64 && chunkText.startsWith(item.b64));
        if (matchedMeta) return matchedMeta.ext;
    } catch {}
    return null;
}
function cleanInboundUrl(inputUrl, origin, allPrefixes) {
    let cleanInput = inputUrl.trim();
    if (cleanInput.startsWith(origin)) cleanInput = cleanInput.substring(origin.length);
    let testPath = cleanInput.startsWith('/') ? cleanInput : '/' + cleanInput;
    let pureUrl = inputUrl.trim();
    for (const p of allPrefixes) {
        if (testPath.startsWith('/' + p + '/')) {
            pureUrl = testPath.substring(p.length + 2);
            if (p === 'gis') pureUrl = `https://gist.githubusercontent.com/raw/${pureUrl}`;
            if (p === 'pas') pureUrl = `https://pastebin.com/raw/${pureUrl}`;
            break;
        }
    }
    return normalizeUrl(pureUrl);
}
export default {
    async fetch(request, env, ctx) {
        const realProto = request.headers.get("x-real-scheme"), realHost = request.headers.get("x-real-host");
        if (realProto && realHost) {
            const u = new URL(request.url);
            request = new Request(`${realProto}://${realHost}${u.pathname}${u.search}${u.hash}`, { method: request.method, headers: request.headers, body: request.method === "GET" || request.method === "HEAD" ? null : request.body, redirect: "manual" });
        }
        const url = new URL(request.url),
              [pAdmin, pShare, pRef, pSimp, pSho, pHid, pDcb] = [CONFIG.HOME_PAGE_PREFIX, CONFIG.SHARE_PREFIX, CONFIG.REFINING_PREFIX, CONFIG.REFINING_OUT_PREFIX, CONFIG.ShortName_PREFIX, CONFIG.hide64_PREFIX, CONFIG.DECODE_B64_PREFIX].map(p => p.replace(/^\/|\/$/g, '')),
              pUhm = [CONFIG.UHM_PREFIX_1, CONFIG.UHM_PREFIX_2, CONFIG.UHM_PREFIX_3].map(p => p.replace(/^\/|\/$/g, '')),
              pUem = [CONFIG.UHM_OUTPUT_1, CONFIG.UHM_OUTPUT_2, CONFIG.UHM_OUTPUT_3].map(p => p.replace(/^\/|\/$/g, ''));
        if (['/favicon.ico', '/apple-touch-icon.png', '/site.webmanifest'].some(p => url.pathname.toLowerCase().startsWith(p))) return new Response(null, { status: 204 });
        if (url.pathname === '/' + pAdmin || url.pathname === '/' + pAdmin + '/') {
            if (request.method === "POST") {
                try {
                    const { url: inputUrl } = await request.json();
                    if (!inputUrl) return new Response(JSON.stringify({ error: "输入链接为空" }), { status: 400 });
                    let origin = url.origin;
                    let pureUrl = cleanInboundUrl(inputUrl, origin, [pAdmin, pShare, pRef, pSimp, pSho, pHid, pDcb, ...pUhm, ...pUem, 'gis', 'pas']);
                    let cleanUpstream = pureUrl.replace('://', '/').replace(REGEX_IMAGE_TAIL, '');
                    let ext = await probeTargetExt(cleanUpstream.replace(REGEX_HTTP, 'https://').replace('https/gist', 'https://gist'));
                    if (!ext) return new Response(JSON.stringify({ error: "无法识别目标流魔术值" }), { status: 403 });
                    let hasNativeExt = checkHasValidExt(cleanUpstream);
                    let tail = `/image.${ext}`;
                    let disUrl = hasNativeExt ? `${origin}/${makeFullUrlPart(cleanUpstream, pShare)}` : `${origin}/${makeFullUrlPart(cleanUpstream, pShare)}${tail}`;
                    let links = { "明文直链反代 (DIS)": disUrl };
                    let regRes = parseRefRegistry(cleanUpstream.replace(REGEX_HTTP, 'https://').replace('https/gist', 'https://gist'));
                    if (regRes) {
                        links["托管精炼反代 (SIMP)"] = `${origin}/${pSimp}/${regRes.site.ref_URL.replace('://', '/')}${regRes.ID}${tail}`;
                        links["特征短链反代 (SHORT)"] = `${origin}/${regRes.site.shortName.replace(/^\//,'')}/${regRes.ID}${tail}`;
                    }
                    let routingPayload = makeFullUrlPart(cleanUpstream, pShare);
                    let b64Payload = btoa(routingPayload).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
                    links["Base64隐藏路由 (DCB)"] = `${origin}/${pDcb}/${b64Payload}${tail}`;
                    for (let i = 1; i <= 3; i++) {
                        let encPayload = await encryptStealthText(b64Payload, CONFIG.STEALTH_KEY, i);
                        links[`AES加密混淆路由 (UHM${i})`] = `${origin}/${pUem[i-1]}/${encPayload}${tail}`;
                    }
                    return new Response(JSON.stringify({ success: true, links }), { headers: { 'Content-Type': 'application/json' } });
                } catch (e) {
                    return new Response(JSON.stringify({ success: false, error: e.message }), { headers: { 'Content-Type': 'application/json' } });
                }
            }
            return new Response(getPanelHTML(), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
        let browserHasImgTail = checkHasValidExt(url.pathname) || REGEX_IMAGE_TAIL.test(url.pathname);
        if (url.pathname.startsWith('/' + pRef + '/') || url.pathname.startsWith('/' + pSho + '/')) {
            const isRef = url.pathname.startsWith('/' + pRef + '/');
            let ctx = parseRouteContext(url.pathname, isRef ? pRef.length : pSho.length, url.search + url.hash);
            let cleanId = url.pathname.substring((isRef ? pRef : pSho).length + 2).split('/')[0];
            if (ctx.registryResult) return Response.redirect(`${url.origin}/${isRef ? pSimp : ctx.registryResult.site.aliasPrefix.replace(/^\//,'')}/${isRef ? ctx.registryResult.ref_URL.replace('://', '/') : ctx.registryResult.ID}`, 302);
            if (!isRef) {
                const prefixGis = `${BASE_AUTH_PREFIX}/gis`.replace(/^\/+/g, '/');
                const prefixPas = `${BASE_AUTH_PREFIX}/pas`.replace(/^\/+/g, '/');
                if (/^[0-9a-f]{32}$/i.test(cleanId)) return Response.redirect(`${url.origin}${prefixGis}/${cleanId}`, 302);
                if (/^[a-zA-Z0-9]{8}$/.test(cleanId)) return Response.redirect(`${url.origin}${prefixPas}/${cleanId}`, 302);
            }
            return Response.redirect(`${url.origin}/${makeFullUrlPart(ctx.fullUrl, pShare)}`, 302);
        }
        let cryptoMode = url.pathname.startsWith('/' + pHid + '/') ? 0 : pUhm.findIndex(p => url.pathname.startsWith('/' + p + '/')) + 1;
        if (cryptoMode > 0 || url.pathname.startsWith('/' + pHid + '/')) {
            const prefix = cryptoMode === 0 ? pHid : pUhm[cryptoMode - 1];
            let routeCtx = parseRouteContext(url.pathname, prefix.length, url.search + url.hash);
            let routingPayload = makeFullUrlPart(routeCtx.fullUrl, pShare);
            let encryptedPayload = btoa(routingPayload).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
            if (cryptoMode > 0) encryptedPayload = await encryptStealthText(encryptedPayload, CONFIG.STEALTH_KEY, cryptoMode);
            return Response.redirect(`${url.origin}/${cryptoMode === 0 ? pDcb : pUem[cryptoMode - 1]}/${encryptedPayload}`, 302);
        }
        let workingPath = url.pathname;
        let uemIdx = pUem.findIndex(p => url.pathname.startsWith('/' + p + '/'));
        if (uemIdx !== -1 || url.pathname.startsWith('/' + pDcb + '/')) {
            const isDcb = url.pathname.startsWith('/' + pDcb + '/');
            let cryptPart = url.pathname.substring((isDcb ? pDcb : pUem[uemIdx]).length + 2).split('/')[0];
            let decryptedB64 = isDcb ? cryptPart : await decryptStealthText(cryptPart, CONFIG.STEALTH_KEY, uemIdx + 1);
            if (!decryptedB64) return new Response("Forbidden: Invalid Crypto Stream", { status: 403 });
            try { 
                let cleanB64 = decryptedB64.replace(/-/g, '+').replace(/_/g, '/');
                let mod = cleanB64.length % 4; if (mod > 0) cleanB64 += "=".repeat(4 - mod);
                workingPath = atob(cleanB64).trim(); 
                if (!workingPath.startsWith('/')) workingPath = '/' + workingPath;
            } catch { return new Response("Forbidden: Corrupted Payload", { status: 403 }); }
        }
        let activeAlias = REFINING_REGISTRY.find(site => workingPath.startsWith(site.aliasPrefix + '/'));
        if (activeAlias) workingPath = '/' + pShare + '/' + activeAlias.ref_URL.replace('://', '/') + workingPath.substring(activeAlias.aliasPrefix.length + 1).split('/')[0];
        if (workingPath.startsWith('/' + pSimp + '/')) workingPath = '/' + pShare + workingPath.substring(pSimp.length + 1);
        workingPath = workingPath.replace(/\/+/g, '/');
        if (!workingPath.startsWith('/' + pShare + '/')) return new Response("Forbidden: Access Denied", { status: 403 });
        let isNativeDisMode = url.pathname.startsWith('/' + pShare + '/');
        if (isNativeDisMode && url.pathname.includes('://')) {
            let cleanPath = `/${pShare}/${url.pathname.replace(/\/+$/, '').replace(/^https?:\/\/[^\/]+\/dis\//i, '').replace('://', '/')}`.replace(/\/+/g, '/').replace(/^\/dis\/dis\//i, '/dis/');
            return Response.redirect(`${url.origin}${cleanPath}${url.search}${url.hash}`, 302);
        }
        let pureUpstreamPath = workingPath.substring(pShare.length + 2).replace(REGEX_IMAGE_TAIL, '');
        let upstreamUrl = null;
        try { upstreamUrl = new URL(pureUpstreamPath.replace(REGEX_HTTP, 'https://').replace('https/gist', 'https://gist')); } catch { return new Response("Invalid Upstream Target", { status: 400 }); }
        const cache = caches.default, cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) { const cachedResponse = await cache.match(cacheKey); if (cachedResponse) return cachedResponse; }
        let upstream = await fetch(upstreamUrl, { method: 'GET', headers: new Headers({ 'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0' }), redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: ${upstream.status}`, { status: upstream.status });
        const contentLength = parseInt(upstream.headers.get("Content-Length") || "-1");
        const maxBackendBytes = CONFIG.BACKEND_MAX_SIZE_KB * 1024;
        if (contentLength > maxBackendBytes) return new Response(`Forbidden: Target file size exceeds backend limit.`, { status: 413 });
        if (contentLength === -1 && CONFIG.ALLOW_BACKEND_CHUNKED_RAW === 0) return new Response("Forbidden: Chunked streaming blocked.", { status: 411 });
        const cleanMime = (upstream.headers.get("Content-Type") || "").split(';')[0].trim().toLowerCase();
        const RAW_IMAGE_MIME_WHITELIST = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/svg+xml", "image/x-icon", "image/bmp"];
        if (RAW_IMAGE_MIME_WHITELIST.includes(cleanMime) || cleanMime === "application/octet-stream") {
            const reader = upstream.body.getReader(), { done, value } = await reader.read();
            if (done || !value) return new Response("Forbidden: Empty Stream", { status: 403 });
            let isRealImage = false, detectedMime = cleanMime, foundExt = "";
            for (const item of MAGIC_REGISTRY) {
                if (item.bytes && value.length >= item.bytes.length && item.bytes.every((b, i) => value[i] === b)) {
                    isRealImage = true; detectedMime = item.mime; foundExt = item.ext; break;
                }
            }
            if (!isRealImage && cleanMime === "image/avif") {
                const textChunk = decoder.decode(value.subarray(0, 30));
                if (textChunk.includes("ftypavif") || textChunk.includes("ftypavis")) { isRealImage = true; foundExt = "avif"; }
            }
            if (!isRealImage) return new Response("Forbidden: Non-image assets blocked.", { status: 403 });
            if (!browserHasImgTail) return Response.redirect(`${url.origin}${url.pathname.replace(/\/+$/, '')}/image.${foundExt}${url.search}${url.hash}`, 302);
            let totalBytesRead = value.length;
            const remainderStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(value);
                    function push() {
                        reader.read().then(({ done, value }) => {
                            if (done) { controller.close(); return; }
                            totalBytesRead += value.length;
                            if (totalBytesRead > maxBackendBytes) { controller.error(new Error(`File size overflowed limit.`)); return; }
                            controller.enqueue(value); push();
                        });
                    }
                    push();
                }
            });
            return makeImageResponse(remainderStream, detectedMime, null, cacheKey, cache, ctx);
        }
        const previewStream = upstream.clone(), b64Reader = previewStream.body.getReader(), chunkData = await b64Reader.read();
        if (!chunkData.value) return new Response("Forbidden: Empty Stream", { status: 403 });
        const chunkText = decoder.decode(chunkData.value).trim().substring(0, 30).replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
        let matchedMeta = MAGIC_REGISTRY.find(item => item.b64 && chunkText.startsWith(item.b64));
        if (!matchedMeta) return new Response("Forbidden: Non-image or unsupported assets blocked.", { status: 403 });
        if (!browserHasImgTail) return Response.redirect(`${url.origin}${url.pathname.replace(/\/+$/, '')}/image.${matchedMeta.ext}${url.search}${url.hash}`, 302);
        try {
            let upstreamText = await upstream.text();
            if (upstreamText.length > maxBackendBytes * 1.35) return new Response(`Forbidden: Base64 payload text size exceeds limit.`, { status: 413 });
            let cleaned = upstreamText.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
            const mod = cleaned.length % 4; if (mod > 1) cleaned += "=".repeat(4 - mod);
            const binary = atob(cleaned), bytes = new Uint8Array(binary.length);
            if (bytes.length > maxBackendBytes) return new Response(`Forbidden: Decoded data size exceeds limit.`, { status: 413 });
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return makeImageResponse(bytes.buffer, matchedMeta.mime, matchedMeta.ext, cacheKey, cache, ctx);
        } catch (e) { return new Response(`Decoder Exception: ${e.message}`, { status: 500 }); }
    }
};
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
        .input-row, .btn-row, .link-item { display: flex; gap: 10px; margin-bottom: 15px; width: 100%; }
        input[type="text"], select.mode-select { flex: 1; padding: 14px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; outline: none; box-sizing: border-box; }
        input[type="text"]:focus, select.mode-select:focus { border-color: #409eff; }
        .btn { padding: 14px; font-size: 14px; color: #fff; background: #409eff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; text-align: center; flex: 1; box-sizing: border-box; }
        .btn:hover { opacity: 0.85; }
        #btnGo { flex: none; width: 120px; }
        .btn-green { background: #67c23a; }
        .btn-purple { background: #8e44ad; }
        .result-box { background: #f8f9fa; border: 1px dashed #dcdfe6; border-radius: 4px; padding: 12px; margin-top: 10px; font-family: monospace; font-size: 13px; word-break: break-all; display: none; }
        .error-tip { color: #f56c6c; font-weight: bold; }
        .success-tip { color: #67c23a; font-weight: bold; }
        .progress-wrapper { width: 100%; background: #ebeef5; border-radius: 10px; margin-top: 15px; display: none; overflow: hidden; position: relative; height: 18px; }
        .progress-bar { height: 100%; width: 0%; background: #67c23a; transition: width 0.1s; }
        .progress-text { position: absolute; width: 100%; text-align: center; font-size: 11px; font-weight: bold; line-height: 18px; }
        .link-item { margin: 8px 0; padding: 6px 0; border-bottom: 1px dashed #e4e7ed; flex-direction: column; gap: 2px; }
        .link-label { font-weight: bold; color: #409eff; font-size: 12px; }
        .link-url { color: #303133; text-decoration: none; font-size: 13px; }
        .link-url:hover { color: #66b1ff; text-decoration: underline; }
    </style>
</head>
<body>
    <div class="box">
        <h3>CDN 纯净图片中转控制面板</h3>
        <div class="input-row">
            <input type="text" id="urlInput" placeholder="直接粘贴各种完整的图片或 Base64 RAW URL...">
            <button class="btn" id="btnGo">跳转反代链接</button>
        </div>
        <div class="btn-row">
            <select id="modeSelect" class="mode-select">
                <option value="/dis">模式: 明文直链反代 (/dis)</option>
                <option value="/ref">模式: 托管地址精炼 (/ref)</option>
                <option value="/sho">模式: 特征短链接 (/sho)</option>
                <option value="/hid">模式: Base64普通隐藏 (/hid)</option>
                <option value="/uhm1">模式: AES隐蔽混淆1 (/uhm1)</option>
                <option value="/uhm2">模式: AES隐蔽混淆2 (/uhm2)</option>
                <option value="/uhm3">模式: AES隐蔽混淆3 (/uhm3)</option>
            </select>
            <button class="btn btn-purple" id="btnRefine">生成反代链接</button>
            <button class="btn btn-green" id="btnPick">文件编码为base64</button>
        </div>
        <div id="resultArea" class="result-box"></div>
        <div class="progress-wrapper" id="progressWrapper">
            <div class="progress-bar" id="progressBar"></div>
            <div class="progress-text" id="progressText">准备编码... 0%</div>
        </div>
        <input type="file" id="fileFile" style="display:none">
    </div>
    <script>
        const FRONTEND_MAX_SIZE_KB = ${CONFIG.FRONTEND_MAX_SIZE_KB};
        const BASE_AUTH_PREFIX = '${BASE_AUTH_PREFIX}';
        const BASE = window.location.origin, resBox = document.getElementById('resultArea');
        function showUI(isErr, text) {
            resBox.style.display = 'block';
            resBox.innerHTML = isErr ? "<span class='error-tip'>错误：" + text + "</span>" : text;
        }
        function getCleanInput() {
            const v = document.getElementById('urlInput').value.trim();
            if (!v) showUI(true, "请输入有效链接！");
            return v;
        }
        document.getElementById('btnGo').onclick = function() {
            const v = getCleanInput(); if (!v) return false;
            let mode = document.getElementById('modeSelect').value;
            if (BASE_AUTH_PREFIX && BASE_AUTH_PREFIX !== "''") mode = BASE_AUTH_PREFIX + mode;
            let c = /^https?:\\/\\//i.test(v) ? v.replace(/^https?:\\/\\//i, m => m.toLowerCase().replace('://', '/')) : (!/^https?\\//i.test(v) ? 'https/' + v : v);
            window.open(BASE + mode + '/' + c, '_blank');
            return false;
        };
        document.getElementById('btnRefine').onclick = function() {
            const v = getCleanInput(); if (!v) return;
            showUI(false, "正在通过主脚本后端特征魔术值识别并批量生成中...");
            fetch(window.location.href, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: v })
            })
            .then(res => res.json())
            .then(data => {
                if (!data.success) return showUI(true, data.error || "生成失败");
                let html = "<span class='success-tip'>批量生成反代链接成功:</span><br>";
                for (let key in data.links) {
                    html += "<div class='link-item'><span class='link-label'>" + key + "</span><a class='link-url' href='" + data.links[key] + "' target='_blank'>" + data.links[key] + "</a></div>";
                }
                showUI(false, html);
            })
            .catch(err => showUI(true, "网络异常或该资产不符合规范：" + err.message));
        };
        document.getElementById('btnPick').onclick = function() { document.getElementById('fileFile').click(); };
        document.getElementById('fileFile').onchange = function() {
            if (!this.files.length) return;
            const f = this.files[0];
            if (f.size > FRONTEND_MAX_SIZE_KB * 1024) {
                showUI(true, "文件大小超过前端限制（最大 " + FRONTEND_MAX_SIZE_KB + " KB）");
                this.value = ""; return;
            }
            const w = document.getElementById('progressWrapper'), b = document.getElementById('progressBar'), t = document.getElementById('progressText');
            w.style.display = 'block'; b.style.width = '0%'; t.textContent = "初始化...";
            const s = 1024 * 256; let o = 0, bin = "";
            const r = () => {
                const reader = new FileReader(), blob = f.slice(o, o + s);
                reader.onload = function(e) {
                    const bytes = new Uint8Array(e.target.result);
                    let ch = ""; for (let i = 0; i < bytes.length; i++) ch += String.fromCharCode(bytes[i]);
                    bin += ch; o += s;
                    let p = Math.min(100, Math.floor((o / f.size) * 100));
                    b.style.width = p + '%'; t.textContent = "编码中: " + p + "%";
                    if (o < f.size) { setTimeout(r, 1); } else {
                        t.textContent = "正在打包...";
                        setTimeout(() => {
                            try {
                                const res = btoa(bin), out = new Blob([res], { type: "text/plain;charset=utf-8" }), u = URL.createObjectURL(out), a = document.createElement('a');
                                a.href = u; a.download = f.name + ".b64"; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
                                t.textContent = "转换成功！文件已开始下载";
                            } catch (err) { t.textContent = "异常：" + err.message; } finally { document.getElementById('fileFile').value = ""; setTimeout(() => { w.style.display = 'none'; }, 3000); }
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