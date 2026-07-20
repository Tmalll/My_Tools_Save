const BASE_AUTH_PREFIX = '';
const PREFIX = {
    admin: `${BASE_AUTH_PREFIX}/home`.replace(/^\/|\/$/g, ''),
    dis: `${BASE_AUTH_PREFIX}/dis`.replace(/^\/|\/$/g, ''),
    ref: `${BASE_AUTH_PREFIX}/ref`.replace(/^\/|\/$/g, ''),
    simp: `${BASE_AUTH_PREFIX}/simp`.replace(/^\/|\/$/g, ''),
    sho: `${BASE_AUTH_PREFIX}/sho`.replace(/^\/|\/$/g, ''),
    hid: `${BASE_AUTH_PREFIX}/hid`.replace(/^\/|\/$/g, ''),
    dcb: `${BASE_AUTH_PREFIX}/dcb`.replace(/^\/|\/$/g, ''),
    uhm: [`${BASE_AUTH_PREFIX}/uhm1`, `${BASE_AUTH_PREFIX}/uhm2`, `${BASE_AUTH_PREFIX}/uhm3`].map(p => p.replace(/^\/|\/$/g, '')),
    uem: [`${BASE_AUTH_PREFIX}/uem1`, `${BASE_AUTH_PREFIX}/uem2`, `${BASE_AUTH_PREFIX}/uem3`].map(p => p.replace(/^\/|\/$/g, ''))
};
const CONFIG = {
    STEALTH_KEY: 'Tmalll_Secret_Salt_2026', DEBUG_MODE: 1, CACHE_TTL: 2592000,
    FRONTEND_MAX_SIZE_KB: 15360, BACKEND_MAX_SIZE_KB: 10240, ALLOW_BACKEND_CHUNKED_RAW: 1
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
        name: "GIST", ref_URL: "https://gist.githubusercontent.com/raw/",
        match_group: [ { regex: /gist\.github\.com\/[^\/]+\/([0-9a-f]{32})/i }, { regex: /gist\.githubusercontent\.com\/[^\/]+\/([0-9a-f]{32})/i }, { regex: /gist\.githubusercontent\.com\/raw\/([0-9a-f]{32})/i } ],
        toRaw: (id) => `https://gist.githubusercontent.com/raw/${id}`
    },
    {
        name: "PASTEBIN", ref_URL: "https://pastebin.com/raw/",
        match_group: [ { regex: /pastebin\.com\/raw\/([a-zA-Z0-9]{8})/i }, { regex: /pastebin\.com\/([a-zA-Z0-9]{8})/i } ],
        toRaw: (id) => `https://pastebin.com/raw/${id}`
    }
];
const encoder = new TextEncoder(), decoder = new TextDecoder();
const REGEX_HTTP = /^(https?):\/+/i, REGEX_IMAGE_TAIL = /\/image\.[a-z0-9]+$/i;
const stripProto = (s) => s.replace(REGEX_HTTP, '');
const stripSlash = (s) => s.replace(/^\/|\/$/g, '');
const err = (msg, code) => new Response(msg, { status: code });
const redirect = (origin, path) => Response.redirect(origin + path, 302);
async function safeCancel(r) { if(r) { try { await r.cancel(); } catch{} } }
function detectImageMagic(chunk, contentType) {
    if (!chunk || chunk.length === 0) return null;
    for (const item of MAGIC_REGISTRY) {
        if (item.bytes && chunk.length >= item.bytes.length && item.bytes.every((b, i) => chunk[i] === b)) return { mime: item.mime, ext: item.ext, isB64: false };
    }
    let txt = decoder.decode(chunk.subarray(0, 45)).trim().substring(0, 30).replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
    let matched = MAGIC_REGISTRY.find(item => item.b64 && txt.startsWith(item.b64));
    if (matched) return { mime: matched.mime, ext: matched.ext, isB64: true };
    if (contentType?.includes("avif") || txt.includes("ftypavif") || txt.includes("ftypavis")) return { mime: "image/avif", ext: "avif", isB64: false };
    return null;
}
function normalizeUrl(urlStr) {
    let raw = urlStr.trim(), proto = "https", m = raw.match(REGEX_HTTP);
    if (m) { proto = m[1].toLowerCase(); raw = stripProto(raw); }
    else if (raw.startsWith('http/')) { proto = 'http'; raw = raw.substring(5); }
    else if (raw.startsWith('https/')) { proto = 'https'; raw = raw.substring(6); }
    let idx = raw.indexOf('/');
    if (idx === -1) return proto + '://' + raw.replace(/\/+/g, '/');
    let host = raw.substring(0, idx).replace(/\/+/g, '/'), path = raw.substring(idx);
    if (host === 'gist.githubusercontent.com' && path.startsWith('/https/')) path = path.substring(6);
    return proto + '://' + host + path;
}
function parseRefRegistry(urlStr) {
    if (!urlStr) return null;
    for (const site of REFINING_REGISTRY) {
        for (const item of site.match_group) {
            const m = urlStr.trim().match(item.regex);
            if (m && m[1]) return { site, ID: m[1], ref_URL: site.toRaw(m[1]) };
        }
    }
    return null;
}
function parseRouteContext(pathname, prefixLength, searchAndHash) {
    let fullUrl = normalizeUrl(pathname.substring(prefixLength + 2) + searchAndHash);
    let clean = fullUrl.replace(/\/+$/, '').split('?')[0];
    if (REGEX_IMAGE_TAIL.test(clean)) clean = clean.replace(REGEX_IMAGE_TAIL, '');
    let lastSlash = clean.lastIndexOf('/'), name = lastSlash === -1 ? clean : clean.substring(lastSlash + 1);
    for (let i = 0; i < 5; i++) {
        if (!name.includes('%')) break;
        try { let next = decodeURIComponent(name); if (next === name) break; name = next; } catch { break; }
    }
    name = name.replace(/[\?#].*$/, '');
    let reg = parseRefRegistry(fullUrl);
    if (reg && reg.ID && name === reg.ID) name = "";
    return { fullUrl, binaryName: name, registryResult: reg, tail: name ? `/${encodeURIComponent(name)}` : '' };
}
function checkHasValidExt(pathStr) {
    let clean = stripSlash(pathStr).split('?')[0].toLowerCase();
    if (REGEX_IMAGE_TAIL.test(clean)) return null;
    for (const item of MAGIC_REGISTRY) { if (clean.endsWith('.' + item.ext)) return item.ext; }
    return (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) ? 'jpg' : null;
}
function makeFullUrlPart(urlStr, pShare) {
    let c = urlStr.trim(), m = c.match(/^(https?):\/\//i);
    if (m) { c = m[1].toLowerCase() + '/' + stripProto(c); }
    else if (!/^https?\\//i.test(c)) { c = 'https/' + c; }
    return `${pShare}/${c}`;
}
let cryptoCtxCache = null;
async function getStealthCryptoContext(seed) {
    if (cryptoCtxCache) return cryptoCtxCache;
    const buf = await crypto.subtle.digest('SHA-256', encoder.encode(seed)), arr = new Uint8Array(buf);
    cryptoCtxCache = { key: await crypto.subtle.importKey('raw', arr.subarray(0, 16), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']), iv: arr.subarray(16, 28) };
    return cryptoCtxCache;
}
function bytesToBase64Url(arr) {
    let buf = [], bytes = new Uint8Array(arr), len = bytes.byteLength, chunk = 8192;
    for (let i = 0; i < len; i += chunk) { buf.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))); }
    return btoa(buf.join("")).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function base64UrlToBytes(s) {
    const clean = s.replace(/-/g, '+').replace(/_/g, '/'), pad = (4 - (clean.length % 4)) % 4;
    const raw = atob(clean + "=".repeat(pad)), arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr.buffer;
}
async function execStealthCrypto(text, seed, mode, isEncrypt) {
    let ctx = await getStealthCryptoContext(seed);
    if (isEncrypt) {
        let bytes = encoder.encode(text);
        if (mode === 3) {
            const cs = new CompressionStream('deflate'), w = cs.writable.getWriter();
            w.write(bytes); w.close(); bytes = new Uint8Array(await new Response(cs.readable).arrayBuffer());
        }
        const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ctx.iv }, ctx.key, bytes);
        return mode === 2 ? Array.from(new Uint8Array(enc)).map(b => b.toString(16).padStart(2, '0')).join('') : bytesToBase64Url(enc);
    } else {
        try {
            let bytes = (mode === 2) ? new Uint8Array(text.match(/.{1,2}/g).map(b => parseInt(b, 16))).buffer : base64UrlToBytes(text);
            let dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ctx.iv }, ctx.key, bytes);
            if (mode === 3) {
                const ds = new DecompressionStream('deflate'), w = ds.writable.getWriter();
                w.write(new Uint8Array(dec)); w.close(); dec = await new Response(ds.readable).arrayBuffer();
            }
            return decoder.decode(dec);
        } catch { return null; }
    }
}
function makeImageResponse(body, mime, isB64Ext, cacheKey, cache, ctx) {
    const resHeaders = new Headers({ "Access-Control-Allow-Origin": "*", "Content-Type": mime, "Cache-Control": CONFIG.DEBUG_MODE === 1 ? "no-store" : `public, max-age=${CONFIG.CACHE_TTL}` });
    if (isB64Ext) resHeaders.set("Content-Disposition", `inline; filename="image.${isB64Ext}"`);
    const resp = new Response(body, { status: 200, headers: resHeaders });
    if (CONFIG.DEBUG_MODE !== 1) ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    return resp;
}
async function probeTargetExt(targetUrl) {
    try {
        let res = await fetch(targetUrl, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0', 'Range': 'bytes=0-63' }, redirect: "follow" });
        if (res.status !== 200 && res.status !== 206) return null;
        let reader = res.body.getReader(), { value } = await reader.read();
        await safeCancel(reader);
        return detectImageMagic(value, res.headers.get("Content-Type"))?.ext || null;
    } catch {}
    return null;
}
function cleanInboundUrl(inputUrl, origin, allPrefixes) {
    let clean = inputUrl.trim();
    if (clean.startsWith(origin)) clean = clean.substring(origin.length);
    let testPath = clean.startsWith('/') ? clean : '/' + clean, pure = inputUrl.trim();
    for (const p of allPrefixes) {
        if (testPath.startsWith('/' + p + '/')) {
            pure = testPath.substring(p.length + 2);
            if (p === 'gis') pure = `https://gist.githubusercontent.com/raw/${pure}`;
            if (p === 'pas') pure = `https://pastebin.com/raw/${pure}`;
            break;
        }
    }
    return normalizeUrl(pure);
}
async function handleAdminRoute(request, url) {
    if (request.method === "POST") {
        try {
            const { url: inputUrl } = await request.json();
            if (!inputUrl) return err("输入链接为空", 400);
            let pureUrl = cleanInboundUrl(inputUrl, url.origin, [PREFIX.admin, PREFIX.dis, PREFIX.ref, PREFIX.simp, PREFIX.sho, PREFIX.hid, PREFIX.dcb, ...PREFIX.uhm, ...PREFIX.uem, 'gis', 'pas']);
            let cleanUpstream = pureUrl.replace(/\/+$/, '').replace(REGEX_IMAGE_TAIL, '');
            let ext = await probeTargetExt(cleanUpstream);
            if (!ext) return err("无法识别目标流魔术值", 403);
            let tail = `/image.${ext}`, disUrl = `${url.origin}/${makeFullUrlPart(cleanUpstream, PREFIX.dis)}${checkHasValidExt(cleanUpstream) ? '' : tail}`;
            let links = { "明文直链反代 (DIS)": disUrl }, reg = parseRefRegistry(cleanUpstream);
            if (reg) {
                links["托管精炼反代 (SIMP)"] = `${url.origin}/${PREFIX.simp}/${stripProto(reg.site.ref_URL)}${reg.ID}${tail}`;
                links["特征短链反代 (SHORT)"] = `${url.origin}/${BASE_AUTH_PREFIX ? stripSlash(BASE_AUTH_PREFIX)+'/' : ''}${reg.site.ref_URL.includes('gist')?'gis':'pas'}/${reg.ID}${tail}`;
            }
            let routingPayload = makeFullUrlPart(cleanUpstream, PREFIX.dis), b64Payload = bytesToBase64Url(encoder.encode(routingPayload));
            links["Base64隐藏路由 (DCB)"] = `${url.origin}/${PREFIX.dcb}/${b64Payload}${tail}`;
            const encTasks = [execStealthCrypto(b64Payload, CONFIG.STEALTH_KEY, 1, true), execStealthCrypto(b64Payload, CONFIG.STEALTH_KEY, 2, true), execStealthCrypto(b64Payload, CONFIG.STEALTH_KEY, 3, true)];
            const encResults = await Promise.all(encTasks);
            for (let i = 1; i <= 3; i++) { links[`AES加密混淆路由 (UHM${i})`] = `${url.origin}/${PREFIX.uem[i-1]}/${encResults[i-1]}${tail}`; }
            return new Response(JSON.stringify({ success: true, links }), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) { return new Response(JSON.stringify({ success: false, error: e.message }), { headers: { 'Content-Type': 'application/json' } }); }
    }
    return new Response(getPanelHTML(), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
async function handleMainImageProxy(request, url, workingPath, ctx, browserHasImgTail) {
    let pureUpstreamPath = workingPath.substring(PREFIX.dis.length + 2).replace(REGEX_IMAGE_TAIL, '');
    let m = pureUpstreamPath.match(/^(https?)\/(.*)/i);
    let upstreamUrlStr = m ? m[1] + '://' + m[2] : 'https://' + pureUpstreamPath, upstreamUrl = null;
    try { upstreamUrl = new URL(upstreamUrlStr + url.search); } catch { return err("Invalid Upstream Target", 400); }
    const cache = caches.default, cacheKey = new Request(url.origin + url.pathname + url.search);
    if (CONFIG.DEBUG_MODE !== 1) { const cached = await cache.match(cacheKey); if (cached) return cached; }
    let upstream = await fetch(upstreamUrl, { method: 'GET', headers: new Headers({ 'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0' }), redirect: "follow" });
    if (upstream.status !== 200) return err(`Upstream Error: ${upstream.status}`, upstream.status);
    const contentLength = parseInt(upstream.headers.get("Content-Length") || "-1"), maxBackendBytes = CONFIG.BACKEND_MAX_SIZE_KB * 1024;
    if (contentLength > maxBackendBytes) return err(`Forbidden: File size overflow.`, 413);
    let reader = upstream.body.getReader(), firstChunkObj = null;
    try { firstChunkObj = await reader.read(); } catch(e) { return err(`Stream Read Error: ${e.message}`, 502); }
    let { done, value: firstChunk } = firstChunkObj;
    if (done || !firstChunk) return err("Forbidden: Empty Stream Source.", 403);
    if (firstChunk.length > maxBackendBytes) { await safeCancel(reader); return err(`Forbidden: Stream overflow.`, 413); }
    let meta = detectImageMagic(firstChunk, upstream.headers.get("Content-Type"));
    if (!meta) { await safeCancel(reader); return err("Forbidden: Non-image assets blocked.", 403); }
    if (!browserHasImgTail) { await safeCancel(reader); return Response.redirect(`${url.origin}${url.pathname.replace(/\/+$/, '')}/image.${meta.ext}${url.search}${url.hash}`, 302); }
    if (!meta.isB64) {
        let totalBytesRead = firstChunk.length, hasError = false;
        let bodyStream = new ReadableStream({
            async start(controller) {
                controller.enqueue(firstChunk);
                try {
                    while (true) {
                        let { done, value } = await reader.read();
                        if (done) { controller.close(); break; }
                        totalBytesRead += value.length;
                        if (totalBytesRead > maxBackendBytes) { hasError = true; await safeCancel(reader); controller.error(new Error("Forbidden: Stream overflow.")); break; }
                        controller.enqueue(value);
                    }
                } catch(e) { if(!hasError) controller.error(e); }
            },
            async cancel() { await safeCancel(reader); }
        });
        return makeImageResponse(bodyStream, meta.mime, null, cacheKey, cache, ctx);
    }
    let totalBytesRead = firstChunk.length, chunks = [firstChunk];
    try {
        while (true) {
            let { done, value } = await reader.read();
            if (done) break;
            if (totalBytesRead + value.length > maxBackendBytes) { await safeCancel(reader); return err(`Forbidden: Stream overflow.`, 413); }
            chunks.push(value); totalBytesRead += value.length;
        }
    } catch(e) { return err(`Stream Body Interrupted: ${e.message}`, 502); }
    let finalBuffer = new Uint8Array(totalBytesRead), offset = 0;
    for (let chunk of chunks) { finalBuffer.set(chunk, offset); offset += chunk.length; }
    try {
        let cleaned = decoder.decode(finalBuffer).replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
        const mod = cleaned.length % 4; if (mod > 1) cleaned += "=".repeat(4 - mod);
        const binary = atob(cleaned), bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return makeImageResponse(bytes.buffer, meta.mime, null, cacheKey, cache, ctx);
    } catch (e) { return err(`Decoder Exception: ${e.message}`, 500); }
}
const ROUTERS = [
    { match: (u) => u.pathname === '/' + PREFIX.admin || u.pathname === '/' + PREFIX.admin + '/', handler: async (req, u) => await handleAdminRoute(req, u) },
    { match: (u) => u.pathname.startsWith('/' + PREFIX.ref + '/') || u.pathname.startsWith('/' + PREFIX.sho + '/'), handler: async (req, u) => {
        const isRef = u.pathname.startsWith('/' + PREFIX.ref + '/');
        let ctx = parseRouteContext(u.pathname, isRef ? PREFIX.ref.length : PREFIX.sho.length, u.search + u.hash);
        let cleanId = u.pathname.substring((isRef ? PREFIX.ref : PREFIX.sho).length + 2).split('/')[0];
        if (ctx.registryResult) {
            let nPath = isRef ? `/${PREFIX.simp}/${stripProto(ctx.registryResult.site.ref_URL)}${ctx.registryResult.ID}` : `/${BASE_AUTH_PREFIX ? stripSlash(BASE_AUTH_PREFIX)+'/' : ''}${ctx.registryResult.site.ref_URL.includes('gist')?'gis':'pas'}/${ctx.registryResult.ID}`;
            return redirect(u.origin, `${nPath.replace(/\/+/g, '/')}${u.search}${u.hash}`);
        }
        if (!isRef) {
            if (/^[0-9a-f]{32}$/i.test(cleanId)) return redirect(u.origin, `${BASE_AUTH_PREFIX}/gis/${cleanId}${u.search}${u.hash}`.replace(/\/+/g, '/'));
            if (/^[a-zA-Z0-9]{8}$/.test(cleanId)) return redirect(u.origin, `${BASE_AUTH_PREFIX}/pas/${cleanId}${u.search}${u.hash}`.replace(/\/+/g, '/'));
        }
        return redirect(u.origin, `/${makeFullUrlPart(ctx.fullUrl, PREFIX.dis)}${u.search}${u.hash}`.replace(/\/+/g, '/'));
    }},
    { match: (u) => u.pathname.startsWith('/' + PREFIX.hid + '/') || PREFIX.uhm.some(p => u.pathname.startsWith('/' + p + '/')), handler: async (req, u) => {
        let mode = u.pathname.startsWith('/' + PREFIX.hid + '/') ? 0 : PREFIX.uhm.findIndex(p => u.pathname.startsWith('/' + p + '/')) + 1;
        let routeCtx = parseRouteContext(u.pathname, (mode === 0 ? PREFIX.hid : PREFIX.uhm[mode - 1]).length, u.search + u.hash);
        let payload = makeFullUrlPart(routeCtx.fullUrl, PREFIX.dis), enc = bytesToBase64Url(encoder.encode(payload));
        if (mode > 0) enc = await execStealthCrypto(enc, CONFIG.STEALTH_KEY, mode, true);
        return redirect(u.origin, `/${mode === 0 ? PREFIX.dcb : PREFIX.uem[mode - 1]}/${enc}${u.search}${u.hash}`);
    }},
    { match: (u) => PREFIX.uem.some(p => u.pathname.startsWith('/' + p + '/')) || u.pathname.startsWith('/' + PREFIX.dcb + '/'), handler: async (req, u, ctx, state) => {
        const isDcb = u.pathname.startsWith('/' + PREFIX.dcb + '/'), idx = PREFIX.uem.findIndex(p => u.pathname.startsWith('/' + p + '/'));
        let crypt = u.pathname.substring((isDcb ? PREFIX.dcb : PREFIX.uem[idx]).length + 2).split('/')[0];
        let decB64 = isDcb ? crypt : await execStealthCrypto(crypt, CONFIG.STEALTH_KEY, idx + 1, false);
        if (!decB64) return err("Forbidden: Invalid Crypto Stream", 403);
        try {
            let clean = decB64.replace(/-/g, '+').replace(/_/g, '/'), mod = clean.length % 4; if (mod > 0) clean += "=".repeat(4 - mod);
            state.workingPath = atob(clean).trim(); if (!state.workingPath.startsWith('/')) state.workingPath = '/' + state.workingPath;
        } catch { return err("Forbidden: Corrupted Payload", 403); }
    }, isFilter: true },
    { match: (u, state) => REFINING_REGISTRY.some(s => (state.workingPath || u.pathname).startsWith(BASE_AUTH_PREFIX ? `/${stripSlash(BASE_AUTH_PREFIX)}/${s.ref_URL.includes('gist')?'gis':'pas'}/` : `/${s.ref_URL.includes('gist')?'gis':'pas'}/`)), handler: async (req, u, ctx, state) => {
        let p = state.workingPath || u.pathname, cleanP = BASE_AUTH_PREFIX ? p.substring(stripSlash(BASE_AUTH_PREFIX).length + 1) : p;
        let alias = cleanP.startsWith('/gis/') ? 'gis' : 'pas', id = cleanP.substring(5).split('/')[0];
        let targetSite = REFINING_REGISTRY.find(s => s.ref_URL.includes(alias === 'gis' ? 'gist' : 'pastebin'));
        state.workingPath = '/' + PREFIX.dis + '/' + stripProto(targetSite.ref_URL) + id;
    }, isFilter: true },
    { match: (u, state) => (state.workingPath || u.pathname).startsWith('/' + PREFIX.simp + '/'), handler: async (req, u, ctx, state) => {
        let p = state.workingPath || u.pathname; state.workingPath = '/' + PREFIX.dis + p.substring(PREFIX.simp.length + 1);
    }, isFilter: true },
    { match: (u) => u.pathname.includes('://'), handler: async (req, u) => {
        let p = u.pathname;
        let idx = p.indexOf('://');
        let protoPart = p.substring(0, idx);
        let cleanProto = protoPart.substring(protoPart.lastIndexOf('/') + 1);
        let remain = p.substring(idx + 3);
        let targetPath = `/${PREFIX.dis}/${cleanProto}/${remain}`.replace(/\/+/g, '/');
        return redirect(u.origin, `${targetPath}${u.search}${u.hash}`);
    }},
    { match: (u, state) => (state.workingPath || u.pathname).startsWith('/' + PREFIX.dis + '/'), handler: async (req, u, ctx, state) => {
        let p = state.workingPath || u.pathname; p = p.replace(/\/+/g, '/');
        if (!p.startsWith('/' + PREFIX.dis + '/')) return err("Forbidden: Access Denied", 403);
        let browserHasTail = checkHasValidExt(u.pathname) || REGEX_IMAGE_TAIL.test(u.pathname);
        return await handleMainImageProxy(req, u, p, ctx, browserHasTail);
    }}
];
export default {
    async fetch(request, env, ctx) {
        const realProto = request.headers.get("x-real-scheme"), realHost = request.headers.get("x-real-host");
        if (realProto && realHost) {
            const u = new URL(request.url);
            request = new Request(`${realProto}://${realHost}${u.pathname}${u.search}${u.hash}`, { method: request.method, headers: request.headers, body: request.method === "GET" || request.method === "HEAD" ? null : request.body, redirect: "manual" });
        }
        const url = new URL(request.url), state = { workingPath: null };
        if (['/favicon.ico', '/apple-touch-icon.png', '/site.webmanifest'].some(p => url.pathname.toLowerCase().startsWith(p))) return new Response(null, { status: 204 });
        for (const router of ROUTERS) {
            if (router.match(url, state)) {
                let res = await router.handler(request, url, ctx, state);
                if (res instanceof Response) return res;
            }
        }
        return err("Not Found", 404);
    }
};
function getPanelHTML() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CDN 纯净图片中转站</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body { font-family: sans-serif; background: #f4f6f9; color: #333; padding: 20px; display: flex; flex-direction: column; align-items: center; }.box { width: 100%; max-width: 650px; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-top: 40px; }h3 { margin-top: 0; color: #2c3e50; }.input-row, .btn-row, .link-item { display: flex; gap: 10px; margin-bottom: 15px; width: 100%; }input[type="text"], select.mode-select { flex: 1; padding: 14px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; outline: none; box-sizing: border-box; }input[type="text"]:focus, select.mode-select:focus { border-color: #409eff; }.btn { padding: 14px; font-size: 14px; color: #fff; background: #409eff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; text-align: center; flex: 1; box-sizing: border-box; }.btn:hover { opacity: 0.85; }#btnGo { flex: none; width: 120px; }.btn-green { background: #67c23a; }.btn-purple { background: #8e44ad; }.result-box { background: #f8f9fa; border: 1px dashed #dcdfe6; border-radius: 4px; padding: 12px; margin-top: 10px; font-family: monospace; font-size: 13px; word-break: break-all; display: none; }.error-tip { color: #f56c6c; font-weight: bold; }.success-tip { color: #67c23a; font-weight: bold; }.progress-wrapper { width: 100%; background: #ebeef5; border-radius: 10px; margin-top: 15px; display: none; overflow: hidden; position: relative; height: 18px; }.progress-bar { height: 100%; width: 0%; background: #67c23a; transition: width 0.1s; }.progress-text { position: absolute; width: 100%; text-align: center; font-size: 11px; font-weight: bold; line-height: 18px; }.link-item { margin: 8px 0; padding: 6px 0; border-bottom: 1px dashed #e4e7ed; flex-direction: column; gap: 2px; }.link-label { font-weight: bold; color: #409eff; font-size: 12px; }.link-url { color: #303133; text-decoration: none; font-size: 13px; }.link-url:hover { color: #66b1ff; text-decoration: underline; }</style></head><body><div class="box"><h3>CDN 纯净图片中转控制面板</h3><div class="input-row"><input type="text" id="urlInput" placeholder="直接粘贴各种完整的图片或 Base64 RAW URL..."><button class="btn" id="btnGo">跳转反代链接</button></div><div class="btn-row"><select id="modeSelect" class="mode-select"><option value="/dis">模式: 明文直链反代 (/dis)</option><option value="/ref">模式: 托管地址精炼 (/ref)</option><option value="/sho">模式: 特征短链接 (/sho)</option><option value="/hid">模式: Base64普通隐藏 (/hid)</option><option value="/uhm1">模式: AES隐蔽混淆1 (/uhm1)</option><option value="/uhm2">模式: AES隐蔽混淆2 (/uhm2)</option><option value="/uhm3">模式: AES隐蔽混淆3 (/uhm3)</option></select><button class="btn btn-purple" id="btnRefine">生成反代链接</button><button class="btn btn-green" id="btnPick">文件编码为base64</button></div><div id="resultArea" class="result-box"></div><div class="progress-wrapper" id="progressWrapper"><div class="progress-bar" id="progressBar"></div><div class="progress-text" id="progressText">准备编码... 0%</div></div><input type="file" id="fileFile" style="display:none"></div><script>const FRONTEND_MAX_SIZE_KB = ${CONFIG.FRONTEND_MAX_SIZE_KB};const BASE_AUTH_PREFIX = '${BASE_AUTH_PREFIX}';const BASE = window.location.origin, resBox = document.getElementById('resultArea');function showUI(isErr, text) { resBox.style.display = 'block'; resBox.innerHTML = isErr ? "<span class='error-tip'>错误：" + text + "</span>" : text; }function getCleanInput() { const v = document.getElementById('urlInput').value.trim(); if (!v) showUI(true, "请输入有效链接！"); return v; }document.getElementById('btnGo').onclick = function() { const v = getCleanInput(); if (!v) return false; let mode = document.getElementById('modeSelect').value; if (BASE_AUTH_PREFIX && BASE_AUTH_PREFIX !== "''") mode = BASE_AUTH_PREFIX + mode; let c = /^https?:\\/\\//i.test(v) ? v.replace(/^https?:\\/\\//i, m => m.toLowerCase().replace('://', '/')) : (!/^https?\\//i.test(v) ? 'https/' + v : v); window.open(BASE + mode + '/' + c, '_blank'); return false; };document.getElementById('btnRefine').onclick = function() { const v = getCleanInput(); if (!v) return; showUI(false, "正在通过主脚本后端特征魔术值识别并批量生成中..."); fetch(window.location.href, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: v }) }).then(res => res.json()).then(data => { if (!data.success) return showUI(true, data.error || "生成失败"); let html = "<span class='success-tip'>批量生成反代链接成功:</span><br>"; for (let key in data.links) { html += "<div class='link-item'><span class='link-label'>" + key + "</span><a class='link-url' href='" + data.links[key] + "' target='_blank'>" + data.links[key] + "</a></div>"; } showUI(false, html); }).catch(err => showUI(true, "网络异常或该资产不符合规范：" + err.message)); };document.getElementById('btnPick').onclick = function() { document.getElementById('fileFile').click(); };document.getElementById('fileFile').onchange = function() { if (!this.files.length) return; const f = this.files[0]; if (f.size > FRONTEND_MAX_SIZE_KB * 1024) { showUI(true, "文件大小超过前端限制（最大 " + FRONTEND_MAX_SIZE_KB + " KB）"); this.value = ""; return; } const w = document.getElementById('progressWrapper'), b = document.getElementById('progressBar'), t = document.getElementById('progressText'); w.style.display = 'block'; b.style.width = '0%'; t.textContent = "初始化..."; const s = 1024 * 256; let o = 0, chunks = [], td = new TextDecoder("latin1"); const r = () => { const reader = new FileReader(), blob = f.slice(o, o + s); reader.onload = function(e) { chunks.push(td.decode(new Uint8Array(e.target.result))); o += s; let p = Math.min(100, Math.floor((o / f.size) * 100)); b.style.width = p + '%'; t.textContent = "编码中: " + p + "%"; if (o < f.size) { setTimeout(r, 1); } else { t.textContent = "正在打包..."; setTimeout(() => { try { const res = btoa(chunks.join("")), out = new Blob([res], { type: "text/plain;charset=utf-8" }), u = URL.createObjectURL(out), a = document.createElement('a'); a.href = u; a.download = f.name + ".b64"; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u); t.textContent = "转换成功！文件已开始下载"; } catch (err) { t.textContent = "异常：" + err.message; } finally { document.getElementById('fileFile').value = ""; setTimeout(() => { w.style.display = 'none'; }, 3000); } }, 50); } }; reader.readAsArrayBuffer(blob); }; r(); };</script></body></html>`;
}