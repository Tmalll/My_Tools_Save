// Cloudflare Workers 和 Snippets 万能反代脚本
// ==================== 全局配置项 ====================
const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD',
    
    // 调试模式：0: 正常模式，1: 关闭所有缓存 (Cache-Control: no-store)
    DEBUG_CACHE_MODE: 0,  

    // DOH 默认约束路径
    DOH_PATHS: new Set(['/dns-query', '/dns-query-7788']),

    // ==================== 🛠️ 统一智能路由注册表 ====================
    // mime选项: 'ORIGIN' (保持源站) | 'AUTO_MAP' (后缀映射) | 具体MIME字符串 (如 text/html)
    // rewrite 智能覆写开关: 
    //   0: 关闭不覆写 | 1: 限有长度且<=max_size | 2: 允许<=max_size或无长度标头 | 3: 强制通通覆写
    // allow_doh 安全DNS开关: 
    //   0: 禁用 DOH | 1: 仅允许 GET (缓存) | 2: 仅允许 POST (不缓存) | 3: 同时允许 GET 和 POST
    ROUTE_REGISTRY: {
        // 核心运行模式 (主控面板展示项)
        'normal':            { path: '',                  mime: 'ORIGIN',                 rewrite: 2, max_size: 15360, cache_ttl: 1800,   allow_doh: 0, isMain: true,  name: '普通 (RAW)' },
        'static':            { path: 'static',            mime: 'AUTO_MAP',               rewrite: 1, max_size: 10240, cache_ttl: 86400,  allow_doh: 0, isMain: true,  name: 'Static 覆写' },
        'static_no_rewrite': { path: 'static_no_rewrite', mime: 'AUTO_MAP',               rewrite: 0, max_size: 0,     cache_ttl: 604800, allow_doh: 0, isMain: true,  name: 'Static 长缓存' },
        'is-doh':            { path: 'is-doh',            mime: 'ORIGIN',                 rewrite: 0, max_size: 0,     cache_ttl: 300,    allow_doh: 1, isMain: true,  name: '强制 DOH (GET)' },
        'is-doh-post':       { path: 'is-doh-post',       mime: 'ORIGIN',                 rewrite: 0, max_size: 0,     cache_ttl: 0,      allow_doh: 2, isMain: true,  name: '强制 DOH (POST)' },
        
        // 强制 MIME 模式扩展 (已完美垂直列对齐)
        'is-html':           { path: 'is-html',           mime: 'text/html',              rewrite: 2, max_size: 15360, cache_ttl: 86400,  allow_doh: 0 },
        'is-md':             { path: 'is-md',             mime: 'text/markdown',          rewrite: 0, max_size: 0,     cache_ttl: 604800, allow_doh: 0 },
        'is-markdown':       { path: 'is-markdown',       mime: 'text/markdown',          rewrite: 0, max_size: 0,     cache_ttl: 604800, allow_doh: 0 },
        'is-css':            { path: 'is-css',            mime: 'text/css',               rewrite: 0, max_size: 0,     cache_ttl: 604800, allow_doh: 0 },
        'is-js':             { path: 'is-js',             mime: 'application/javascript', rewrite: 0, max_size: 0,     cache_ttl: 604800, allow_doh: 0 },
        'is-json':           { path: 'is-json',           mime: 'application/json',       rewrite: 0, max_size: 0,     cache_ttl: 86400,  allow_doh: 0 },
        'is-txt':            { path: 'is-txt',            mime: 'text/plain',             rewrite: 0, max_size: 0,     cache_ttl: 86400,  allow_doh: 0 },
        'is-xml':            { path: 'is-xml',            mime: 'text/xml',               rewrite: 0, max_size: 0,     cache_ttl: 86400,  allow_doh: 0 },
        'is-csv':            { path: 'is-csv',            mime: 'text/csv',               rewrite: 0, max_size: 0,     cache_ttl: 86400,  allow_doh: 0 }
    }
};

const MEM_CACHE = new Map();
const IN_FLIGHT_DOH = new Map();

const MIME_MAP = {
    'css': 'text/css',
    'htm': 'text/html',
    'html': 'text/html',
    'js': 'application/javascript',
    'mjs': 'application/javascript',
    'json': 'application/json',
    'jsonld': 'application/ld+json',
    'md': 'text/markdown',
    'markdown': 'text/markdown',
    'xml': 'text/xml',
    'txt': 'text/plain',
    'csv': 'text/csv'
};

function getCacheControl(ttl) {
    if (CONFIG.DEBUG_CACHE_MODE === 1) {
        return "no-store, no-cache, must-revalidate, max-age=0";
    }
    return ttl > 0 ? `public, max-age=${ttl}, s-maxage=${ttl}, must-revalidate` : "no-cache, no-store, must-revalidate, max-age=0";
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const cleanPath = url.pathname.toLowerCase();
        
        if (cleanPath === '/favicon.ico' || 
            cleanPath === '/apple-touch-icon.png' || 
            cleanPath === '/apple-touch-icon-precomposed.png' || 
            cleanPath === '/site.webmanifest' || 
            cleanPath === '/browserconfig.xml' || 
            cleanPath.includes('android-chrome-')) {
            return new Response(null, { status: 204 });
        }

        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "*"
                }
            });
        }

        const targetQueryUrl = url.searchParams.get('url');
        if (targetQueryUrl) {
            let targetPath = targetQueryUrl.replace(/^https?:\/\//i, '');
            return Response.redirect(url.origin + CONFIG.AUTH_PREFIX + '/https/' + targetPath, 302);
        }

        const cleanPrefix = CONFIG.AUTH_PREFIX.replace(/^\/+|\/+$/g, '');
        let path = url.pathname;
        
        if (path === '/' + cleanPrefix || path === '/' + cleanPrefix + '/') {
            path = '/';
        } else if (path.startsWith('/' + cleanPrefix + '/')) {
            path = path.substring(cleanPrefix.length + 1); 
        } else {
            return new Response("Unauthorized", { status: 403 });
        }

        let modeKey = 'normal';
        let subPath = path;
        const pathSegments = path.split('/').filter(p => p !== '');
        const firstPart = pathSegments[0];

        if (firstPart && CONFIG.ROUTE_REGISTRY[firstPart]) {
            modeKey = firstPart;
            subPath = '/' + pathSegments.slice(1).join('/');
        } else {
            subPath = '/' + pathSegments.join('/');
        }

        const currentMode = CONFIG.ROUTE_REGISTRY[modeKey];

        if (subPath === '/' && url.search === '') {
            if (request.method === 'HEAD') {
                return new Response(null, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            }
            return new Response(getHelpHTML(url.origin), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }        

        let targetPath = subPath.slice(1) + url.search + url.hash;
        if (!targetPath) return new Response("Missing target path", { status: 400 });

        let target;
        let referer = request.headers.get('Referer');
        let isApiCall = false;

        if (/^https?[:\/]+/i.test(targetPath)) {
            let fullTarget = targetPath.replace(/^https?[:\/]+/i, 'https://');
            if (targetPath.startsWith('http/')) fullTarget = targetPath.replace(/^http[:\/]+/i, 'http://');
            try { target = new URL(fullTarget); } catch { return new Response("Invalid target URL", { status: 400 }); }
        }
        else if (referer && (targetPath.startsWith("_graphql") || targetPath.startsWith("_filter"))) {
            isApiCall = true;
            try {
                let refererUrl = new URL(referer);
                let refererPath = refererUrl.pathname.slice(1);
                let parts = refererPath.split('/');
                let startIndex = CONFIG.AUTH_PREFIX ? CONFIG.AUTH_PREFIX.split('/').length - 1 : 0;
                
                const secondPart = refererUrl.pathname.split('/').filter(p => p !== '')[startIndex];
                if (secondPart && CONFIG.ROUTE_REGISTRY[secondPart]) {
                    startIndex += 1;
                }
                target = new URL(`${parts[startIndex]}://${parts[startIndex + 1]}/${targetPath}`);
            } catch (e) {
                return new Response("Error parsing referer", { status: 400 });
            }
        }
        else {
            return new Response("Invalid Proxy Format", { status: 400 });
        }

        // 🟢 精准判定 DOH 路由控制（修正：如果显式配置了关闭，即使符合路径也不走 DOH 处理器）
        const isDohPath = CONFIG.DOH_PATHS.has(target.pathname);
        if (currentMode.allow_doh > 0 || (isDohPath && currentMode.allow_doh !== 0)) {
            const allowed = currentMode.allow_doh > 0 ? currentMode.allow_doh : 3; 
            if (request.method === 'POST' && !(allowed & 2)) {
                return new Response("POST DOH Not Allowed In This Mode", { status: 405 });
            }
            if (request.method === 'GET' && !(allowed & 1)) {
                return new Response("GET DOH Not Allowed In This Mode", { status: 405 });
            }
            return handleDOH(request, target, ctx, currentMode.cache_ttl);
        }

        const headers = new Headers();
        request.headers.forEach((value, key) => {
            if (!/^(host|origin|referer)$/i.test(key)) {
                headers.set(key, value.replace(url.origin, target.origin));
            }
        });

        headers.set("Host", target.hostname);
        headers.set("Referer", target.origin + "/");
        headers.set("Origin", target.origin);

        if (!headers.has('User-Agent')) {
            let userUA = request.headers.get('User-Agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';
            headers.set('User-Agent', userUA);
        }

        if (target.hostname.includes('github.com')) {
            headers.set('X-Requested-With', 'XMLHttpRequest');
            headers.set('Accept', isApiCall ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
            if (isApiCall) headers.delete('Content-Type');
        }

        const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

        const upstream = await fetch(target, {
            method: request.method,
            headers,
            body: hasBody ? request.body : null,
            redirect: "manual"
        });

        if (upstream.status >= 300 && upstream.status < 400 && upstream.headers.get("Location")) {
            const loc = new URL(upstream.headers.get("Location"), target).href;
            let redirectPrefix = currentMode.path ? `${CONFIG.AUTH_PREFIX}/${currentMode.path}` : CONFIG.AUTH_PREFIX;
            const pathSegment = redirectPrefix + "/https/";
            const newLocation = url.origin + "/" + loc.replace(/^https?:\/\//i, pathSegment.slice(1));
            
            return new Response(null, {
                status: upstream.status, 
                headers: { "Location": newLocation }
            });
        }

        const respHeaders = new Headers(upstream.headers);
        [
            "content-security-policy", "content-security-policy-report-only",
            "permissions-policy", "permissions-policy-report-only",
            "cross-origin-embedder-policy", "cross-origin-embedder-policy-report-only",
            "cross-origin-resource-policy", "cross-origin-resource-policy-report-only",
            "cross-origin-opener-policy", "cross-origin-opener-policy-report-only",
            "origin-agent-cluster", "x-frame-options", "x-content-type-options"
        ].forEach(h => respHeaders.delete(h));
        
        respHeaders.set("access-control-allow-origin", "*");

        const originContentType = upstream.headers.get("content-type") || "";
        const extMatch = target.pathname.match(/\.([a-zA-Z0-9]+)$/);
        const extension = extMatch ? extMatch[1].toLowerCase() : "";

        const backupUpstream = upstream.clone(); 
        let responseBody = upstream.body;
        let rewriteSuccess = false;

        const isHtmlContent = originContentType.toLowerCase().includes("text/html") || ["html", "htm"].includes(extension);

        let needsHtmlRewrite = false;
        if (currentMode.rewrite > 0) {
            if (currentMode.mime === 'text/html') {
                needsHtmlRewrite = true; 
            } else if (currentMode.mime === 'ORIGIN' || currentMode.mime === 'AUTO_MAP') {
                needsHtmlRewrite = isHtmlContent; 
            }
        }

        let shouldRewrite = false;
        if (needsHtmlRewrite) {
            if (currentMode.rewrite === 3) {
                shouldRewrite = true; 
            } else {
                const contentLengthHeader = upstream.headers.get("content-length");
                if (contentLengthHeader !== null) {
                    const contentLength = parseInt(contentLengthHeader, 10);
                    if (contentLength <= currentMode.max_size * 1024) {
                        shouldRewrite = true; 
                    }
                } else if (currentMode.rewrite === 2) {
                    shouldRewrite = true; 
                }
            }
        }

        if (shouldRewrite) {
            try {
                let html = await upstream.text();
                let rewritePrefix = currentMode.path ? `${CONFIG.AUTH_PREFIX}/${currentMode.path}` : CONFIG.AUTH_PREFIX;
                const simplePrefix = rewritePrefix + "/https/" + target.hostname;

                html = html.replace(/\b(href|src|action|data-url|data-pjax|data-turbo-frame|srcset|poster|data-src)=["']\/([^\/][^"']*)/gi, `$1="${simplePrefix}/$2"`);
                html = html.replace(new RegExp(target.origin.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '(?=[\/"\'])', 'gi'), simplePrefix);
                html = html.replace(/\b(href|src|action)=["'](https?:\/\/[^"']+)/gi, (match, attr, urlStr) => {
                    try {
                        if (urlStr.includes(CONFIG.AUTH_PREFIX) || urlStr.includes(simplePrefix)) return match;
                        const urlObj = new URL(urlStr);
                        if (urlObj.origin === target.origin) {
                            return `${attr}="${simplePrefix}${urlObj.pathname + urlObj.search + urlObj.hash}"`;
                        } else {
                            return `${attr}="${url.origin}${rewritePrefix}/${urlObj.protocol.slice(0, -1)}/${urlObj.hostname}${urlObj.pathname + urlObj.search + urlObj.hash}"`;
                        }
                    } catch { return match; }
                });

                const universalScript = `<script>(function(){if(window.__PROXY_INJECTED__)return;window.__PROXY_INJECTED__=true;const p="${simplePrefix}";function f(u){if(typeof u!=='string'||u.includes('${CONFIG.AUTH_PREFIX}')||u.includes(p))return u;if((u.startsWith('/')&&!u.startsWith('//'))||u.startsWith('/_'))return p+u;return u;}const oF=window.fetch;window.fetch=(i,n)=>oF(typeof i==='string'?f(i):i,n);const oX=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u,...r){return oX.call(this,m,typeof u==='string'?f(u):u,...r);};})();</script>`;
                
                html = html.includes('</head>') ? html.replace('</head>', universalScript + '</head>') : (html.includes('</body>') ? html.replace('</body>', universalScript + '\n</body>') : html + universalScript);

                responseBody = html;
                rewriteSuccess = true;
            } catch (e) {
                console.error('[HTML Rewrite Error]', e.message);
                responseBody = backupUpstream.body; 
                rewriteSuccess = false; 
            }
        }

        let finalMime = null;
        if (currentMode.mime === 'ORIGIN') {
            if (originContentType) finalMime = originContentType;
        } 
        else if (currentMode.mime === 'AUTO_MAP') {
            if (isHtmlContent) {
                finalMime = "text/html; charset=utf-8";
            } else if (MIME_MAP.hasOwnProperty(extension)) {
                const mapMime = MIME_MAP[extension];
                const needsCharset = mapMime.startsWith('text/') || ['javascript', 'json'].some(k => mapMime.includes(k));
                finalMime = `${mapMime}${needsCharset ? "; charset=utf-8" : ""}`;
            } else if (!rewriteSuccess && originContentType) {
                finalMime = originContentType; 
            }
        } 
        else {
            const baseMime = currentMode.mime;
            const needsCharset = baseMime.startsWith('text/') || ['javascript', 'json'].some(k => baseMime.includes(k));
            finalMime = `${baseMime}${needsCharset ? "; charset=utf-8" : ""}`;
        }

        if (finalMime) {
            respHeaders.set("Content-Type", finalMime);
        } else {
            respHeaders.delete("Content-Type");
        }

        respHeaders.set("Cache-Control", getCacheControl(currentMode.cache_ttl));

        return new Response(responseBody, { status: upstream.status, headers: respHeaders });
    }
};

// 🟢 深度重构后的稳定 DOH 处理器
async function handleDOH(request, target, ctx, globalTtl) {
    if (request.method !== 'GET') {
        const dohHeaders = new Headers();
        dohHeaders.set("Accept", "application/dns-message");
        dohHeaders.set("Content-Type", "application/dns-message");
        dohHeaders.set('User-Agent', request.headers.get('User-Agent') || '');
        // 允许自动重定向跟随，不手动锁死 Host，交由 CF 底层自由寻址映射
        return fetch(target.href, { method: 'POST', headers: dohHeaders, body: request.body, redirect: "follow" });
    }

    const cache = caches.default;
    // 使用干净纯粹的 string url 匹配缓存，避免在特定环境下 Request 头部锁定引发的异常
    const cacheKey = target.href;
    const now = Date.now();

    const memRecord = MEM_CACHE.get(target.href);
    if (memRecord && memRecord.expires > now) {
        const headers = new Headers({
            "Content-Type": "application/dns-message",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": `public, max-age=${globalTtl}`
        });
        return new Response(memRecord.bytes.slice(0), { status: 200, headers });
    } else if (memRecord) {
        MEM_CACHE.delete(target.href);
    }

    let cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
        const cacheBuffer = await cachedResponse.arrayBuffer();
        const cacheBytes = new Uint8Array(cacheBuffer);
        MEM_CACHE.set(target.href, {
            bytes: cacheBytes,
            expires: now + (globalTtl * 1000)
        });
        
        const headers = new Headers({
            "Content-Type": "application/dns-message",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": `public, max-age=${globalTtl}`
        });
        return new Response(cacheBytes.slice(0), { status: 200, headers });
    }

    const lockKey = target.href;
    let upstreamPromise = IN_FLIGHT_DOH.get(lockKey);

    if (!upstreamPromise) {
        upstreamPromise = (async () => {
            try {
                const dohHeaders = new Headers();
                dohHeaders.set("Accept", "application/dns-message");                
                dohHeaders.set('User-Agent', request.headers.get('User-Agent') || '');
                // 🟢 不再锁死 Host 头，防止 dns.google.com 到 dns.google 重定向时引发的源站风控重置异常

                const res = await fetch(target.href, { method: 'GET', headers: dohHeaders, redirect: "follow" });
                if (res.status === 200) {
                    const rawBuffer = await res.arrayBuffer();
                    return { status: 200, bytes: new Uint8Array(rawBuffer), errorText: null };
                }
                return { status: res.status, bytes: null, errorText: await res.text() };
            } catch (e) {
                return { status: 502, bytes: null, errorText: `Fetch Exception: ${e.message}` };
            } finally {
                IN_FLIGHT_DOH.delete(lockKey);
            }
        })();
        IN_FLIGHT_DOH.set(lockKey, upstreamPromise);
    }

    const result = await upstreamPromise;

    if (result.status === 200 && result.bytes) {
        const headers = new Headers({
            "Content-Type": "application/dns-message",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": `public, max-age=${globalTtl}`
        });

        const responseToReturn = new Response(result.bytes.slice(0), { status: 200, headers });
        
        if (ctx && typeof ctx.waitUntil === 'function') {
            const responseToCache = new Response(result.bytes.slice(0), { status: 200, headers });
            ctx.waitUntil(cache.put(cacheKey, responseToCache));
        }

        MEM_CACHE.set(target.href, {
            bytes: result.bytes,
            expires: now + (globalTtl * 1000)
        });

        return responseToReturn;
    }
    
    const debugErrorMessage = `[DOH Forwarder Error]\nTarget URL  : ${target.href}\nStatus Code : ${result.status}\nRaw Message : ${result.errorText || 'No explicit response body.'}`;
    return new Response(debugErrorMessage, { status: result.status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// ==================== 🎨 完全自适应主页前端 HTML 模板 ====================
function getHelpHTML(origin) {
    const prefix = `${origin}${CONFIG.AUTH_PREFIX}`; 
    
    const radiosHtml = Object.entries(CONFIG.ROUTE_REGISTRY)
        .filter(([_, cfg]) => cfg.isMain)
        .map(([key, cfg], i) => {
            return `<label><input type="radio" name="mode" value="${key}" ${i===0?'checked':''}> ${cfg.name}</label>`;
        }).join('');

    const mainExamplesHtml = Object.entries(CONFIG.ROUTE_REGISTRY)
        .filter(([_, cfg]) => cfg.isMain)
        .map(([key, cfg]) => {
            const currentPfx = cfg.path ? `${prefix}/${cfg.path}` : prefix;
            return `<p>• ${cfg.name}: <a href="${currentPfx}/https/github.com/2dust/v2rayN" target="_blank">${currentPfx}/https/...</a></p>`;
        }).join('');

    const forceMimeHtml = Object.entries(CONFIG.ROUTE_REGISTRY)
        .filter(([_, cfg]) => !cfg.isMain)
        .map(([key, cfg]) => {
            const currentPfx = `${prefix}/${cfg.path}/`;
            const rewriteTag = cfg.rewrite > 0 ? ` + 覆写状态[${cfg.rewrite}]` : '';
            return `<p>• 强制 ${key.replace('is-', '').toUpperCase()}: <a href="${currentPfx}" target="_blank">${currentPfx}</a> <code>${cfg.mime}${rewriteTag}</code></p>`;
        }).join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Proxy Panel</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;max-width:700px;margin:25px auto;padding:0 20px;color:#333;line-height:1.5}.panel{background:#f5f5f5;padding:12px;border-radius:6px;margin:15px 0}form{display:flex;margin-bottom:8px}input{flex:1;padding:7px;font-size:14px;border:1px solid #ccc;border-radius:4px 0 0 4px;outline:none}button{padding:7px 14px;background:#0076ff;color:#fff;border:none;border-radius:0 4px 4px 0;cursor:pointer}label{margin-right:12px;font-size:13px;cursor:pointer}p{margin:3px 0;font-size:13px;word-break:break-all}a{color:#0076ff;text-decoration:none}a:hover{text-decoration:underline}code{background:#e8e8e8;padding:1px 3px;border-radius:3px;font-size:11px}.notice{margin-top:20px;padding:10px;background:#fff3cd;color:#856404;border:1px solid #ffeeba;border-radius:4px;font-size:12px}</style></head><body>
    <h3>Proxy Control Panel</h3>
    
    <div class="panel">
        <form id="proxyForm">
            <input type="text" id="urlInput" placeholder="输入目标 URL (支持带任意旧前缀的二次过滤清洗)" required>
            <button type="submit">Go!</button>
        </form>
        <div>${radiosHtml}</div>
    </div>

    <p><b>💡 核心模式示例：</b></p>
    ${mainExamplesHtml}
    
    <p style="margin-top:12px"><b>🛠️ 强制 MIME 模式说明（截断到标识符处，后续可自行拼接）：</b></p>
    ${forceMimeHtml}

    <div class="notice">
        <strong>⚠️ DOH 风险提示与关键约束：</strong><br>
        安全 DNS 极易高频消耗免费请求额度。反代 DOH 目标<b>必须使用合法域名格式</b>（如 dns.google），严禁直接填写纯 IP（如 94.140.14.14），否则受 CF 架构反 SSRF 机制限制，将强制熔断并触发 error code: 1003 封禁。
    </div>

    <script>
        const registry = ${JSON.stringify(CONFIG.ROUTE_REGISTRY)};
        const prefix = '${prefix}';

        document.getElementById('proxyForm').addEventListener('submit', function(e) {
            e.preventDefault();
            let u = document.getElementById('urlInput').value.trim();
            if(!u) return;
            
            const mode = document.querySelector('input[name="mode"]:checked').value;
            const pathPart = registry[mode].path;
            const prfx = pathPart ? (prefix + '/' + pathPart) : prefix;
            
            if(u.includes('${CONFIG.AUTH_PREFIX}')){ 
                u = u.split('${CONFIG.AUTH_PREFIX}')[1];
                Object.keys(registry).forEach(function(k) {
                    if (registry[k].path && u.startsWith('/' + registry[k].path + '/')) {
                        u = u.substring(registry[k].path.length + 1);
                    }
                });
                u = u.replace(/^\\/+/, '');
            }
            
            if(/^https?:\\/\\//i.test(u)){ 
                u = u.replace(/^https?:\\/\\//i, function(m){ return m.toLowerCase().replace('://', '/'); }); 
            } else if(!/^https?\\//i.test(u)){ 
                u = 'https/' + u; 
            }
            
            window.open(prfx + '/' + u, '_blank');
        });
    </script>
</body></html>`;
}


https://456789.968050.xyz/SP3eHm618kN71DD/https/dns.google.com/dns-query 可用
https://456789.968050.xyz/SP3eHm618kN71DD/static/https/dns.google.com/dns-query 可用
https://456789.968050.xyz/SP3eHm618kN71DD/static_no_rewrite/https/dns.google.com/dns-query 可用
浏览器打开此链接后, 跳转成 /https/dns.google/dns-query
allow_doh: 0, 依然不管用...
DOH_PATHS 需要重新梳理 DOH_PATHS 和 allow_doh: 0 的关系.
我感觉还是此处的逻辑错误, 你搞得过于复杂和嵌套....
// 🟢 精准判定 DOH 路由控制（修正：如果显式配置了关闭，即使符合路径也不走 DOH 处理器）
        const isDohPath = CONFIG.DOH_PATHS.has(target.pathname);
        if (currentMode.allow_doh > 0 || (isDohPath && currentMode.allow_doh !== 0)) {
            const allowed = currentMode.allow_doh > 0 ? currentMode.allow_doh : 3; 
            if (request.method === 'POST' && !(allowed & 2)) {
                return new Response("POST DOH Not Allowed In This Mode", { status: 405 });
            }
            if (request.method === 'GET' && !(allowed & 1)) {
                return new Response("GET DOH Not Allowed In This Mode", { status: 405 });
            }
            return handleDOH(request, target, ctx, currentMode.cache_ttl);
        }

allow_doh: 0, 的情况下, 如果匹配到 DOH_PATHS 中设定的 /dns-query 或其他 /path, 应该直接抛出错误 400 or 403, 脚本不要继续往下走了...
剩下就是判定 1 / 2 / 3 的情况...

https://456789.968050.xyz/SP3eHm618kN71DD/is-doh/https/dns.google.com/dns-query 不可用
https://456789.968050.xyz/SP3eHm618kN71DD/is-doh/https/dns.google/dns-query 可用, 应该是没有跳转的原因


https://456789.968050.xyz/SP3eHm618kN71DD/is-doh-post/https/dns.google.com/dns-query 不可用, 可能是 dnslookup 不支持 POST请求方式
你给我写一个CURL的 POST DOH 测试命令我在试试...