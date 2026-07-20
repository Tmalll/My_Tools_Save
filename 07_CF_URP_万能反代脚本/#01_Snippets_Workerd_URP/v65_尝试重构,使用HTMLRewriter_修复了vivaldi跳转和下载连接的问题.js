const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD', // 全局安全前缀
    DEBUG_CACHE_MODE: 1,             // 调试模式开关：0: 正常模式, 开启缓存，1: 调试模式, 禁用所有缓存 (no-store)
    MAX_MEM_CACHE: 2048,             // 限制 DOH 内存缓存最大容量，防止爆内存

    DOH_PATHS: new Set(['/dns-query', '/dns-query-7788']),

    ROUTE_REGISTRY: {
        'normal':            { set_path: '',                  set_mime: 'ORIGIN',                  set_rewrite: 3, max_size: 15360, cache_ttl: 1800,   allow_doh: 3, isMain: true,  display_name: '普通 (RAW)' },
        'static':            { set_path: 'static',            set_mime: 'AUTO_MAP',                set_rewrite: 2, max_size: 10240, cache_ttl: 86400,  allow_doh: 0, isMain: true,  display_name: 'Static 覆写' },
        'static_no_rewrite': { set_path: 'static_no_rewrite', set_mime: 'AUTO_MAP',                set_rewrite: 1, max_size: 10240, cache_ttl: 604800, allow_doh: 0, isMain: true,  display_name: 'Static 长缓存' },
        'is-doh':            { set_path: 'is-doh',            set_mime: 'ORIGIN',                  set_rewrite: 0, max_size: 0,     cache_ttl: 300,    allow_doh: 1, isMain: false, display_name: '强制 DOH (GET)' },
        'is-doh-post':       { set_path: 'is-doh-post',       set_mime: 'ORIGIN',                  set_rewrite: 0, max_size: 0,     cache_ttl: 0,      allow_doh: 2, isMain: false, display_name: '强制 DOH (POST)' },
        
        'is-html':           { set_path: 'is-html',           set_mime: 'text/html',               set_rewrite: 2, max_size: 15360, cache_ttl: 86400,  allow_doh: 0 },
        'is-md':             { set_path: 'is-md',             set_mime: 'text/markdown',           set_rewrite: 0, max_size: 0,     cache_ttl: 604800, allow_doh: 0 },
        'is-markdown':       { set_path: 'is-markdown',       set_mime: 'text/markdown',           set_rewrite: 0, max_size: 0,     cache_ttl: 604800, allow_doh: 0 },
        'is-css':            { set_path: 'is-css',            set_mime: 'text/css',                set_rewrite: 0, max_size: 0,     cache_ttl: 604800, allow_doh: 0 },
        'is-js':             { set_path: 'is-js',             set_mime: 'application/javascript',  set_rewrite: 0, max_size: 0,     cache_ttl: 604800, allow_doh: 0 },
        'is-json':           { set_path: 'is-json',           set_mime: 'application/json',        set_rewrite: 0, max_size: 0,     cache_ttl: 86400,  allow_doh: 0 },
        'is-txt':            { set_path: 'is-txt',            set_mime: 'text/plain',              set_rewrite: 0, max_size: 0,     cache_ttl: 86400,  allow_doh: 0 },
        'is-xml':            { set_path: 'is-xml',            set_mime: 'text/xml',                set_rewrite: 0, max_size: 0,     cache_ttl: 86400,  allow_doh: 0 },
        'is-csv':            { set_path: 'is-csv',            set_mime: 'text/csv',                set_rewrite: 0, max_size: 0,     cache_ttl: 86400,  allow_doh: 0 }
    }
};

const MEM_CACHE = new Map();
const IN_FLIGHT_DOH = new Map();

const MIME_MAP = {
    'css': 'text/css', 'htm': 'text/html', 'html': 'text/html', 'js': 'application/javascript',
    'mjs': 'application/javascript', 'json': 'application/json', 'jsonld': 'application/ld+json',
    'md': 'text/markdown', 'markdown': 'text/markdown', 'xml': 'text/xml', 'txt': 'text/plain', 'csv': 'text/csv'
};

export default {
    async fetch(request, env, ctx) {
        // NGX反代专用协议修复层
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
        const cleanPath = url.pathname.toLowerCase();
        
        // ---------------- [1. 浏览器元数据快速熔断] ----------------
        if (cleanPath === '/favicon.ico' || cleanPath === '/apple-touch-icon.png' || 
            cleanPath === '/apple-touch-icon-precomposed.png' || cleanPath === '/site.webmanifest' || 
            cleanPath === '/browserconfig.xml' || cleanPath.includes('android-chrome-')) {
            return new Response(null, { status: 204 });
        }

        // ---------------- [2. 统一处理跨域预检] ----------------
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

        // ---------------- [3. URL 参数快捷重定向入口] ----------------
        const targetQueryUrl = url.searchParams.get('url');
        if (targetQueryUrl) {
            let targetPath = targetQueryUrl.replace(/^https?:\/\//i, '');
            return Response.redirect(url.origin + CONFIG.AUTH_PREFIX + '/https/' + targetPath, 302);
        }

        // ---------------- [4. 基础前缀鉴权与路径剥离 与 路径规范化] ----------------
        const cleanPrefix = CONFIG.AUTH_PREFIX.replace(/^\/+|\/+$/g, '');
        let path = url.pathname;
        
        if (path === '/' + cleanPrefix || path === '/' + cleanPrefix + '/') {
            path = '/';
        } else if (path.startsWith('/' + cleanPrefix + '/')) {
            path = path.substring(cleanPrefix.length + 1); 
        } else {
            return new Response("Unauthorized", { status: 403 });
        }

        if (path.includes('/https://') || path.includes('/http://')) {
            let normalizedPath = path.replace(/\/https?:\/\/+/i, (m) => m.toLowerCase().startsWith('/http:') ? '/http/' : '/https/');
            const redirectPrefix = CONFIG.AUTH_PREFIX.endsWith('/') ? CONFIG.AUTH_PREFIX.slice(0, -1) : CONFIG.AUTH_PREFIX;
            return Response.redirect(url.origin + redirectPrefix + normalizedPath + url.search + url.hash, 301);
        }

        // ---------------- [5. 智能路由匹配与分流] ----------------
        let modeKey = 'normal';
        const pathSegments = path.split('/').filter(p => p !== '');
        const firstPart = pathSegments[0];

        if (firstPart && CONFIG.ROUTE_REGISTRY[firstPart]) {
            modeKey = firstPart;
            path = '/' + pathSegments.slice(1).join('/');
        } else {
            path = '/' + pathSegments.join('/');
        }

        const currentMode = CONFIG.ROUTE_REGISTRY[modeKey];

        // 访问主页则下发引导控制面板
        if (path === '/' && url.search === '') {
            if (request.method === 'HEAD') {
                return new Response(null, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            }
            return new Response(getHelpHTML(url.origin), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }        

        // ---------------- [6. 还原代理目标站点的真实 URL] ----------------
        let targetPath = path.slice(1) + url.search + url.hash;
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

        if (url.pathname.endsWith('/') && !target.pathname.endsWith('/')) {
            target.pathname += '/';
        }

        // ---------------- [7. DOH 安全隔离分流边界] ----------------
        if (CONFIG.DOH_PATHS.has(target.pathname)) {
            const allowed = currentMode.allow_doh;
            if (allowed === 0) return new Response("DOH Forbidden In This Mode", { status: 403 });
            if (request.method === 'GET' && !(allowed & 1)) return new Response("GET DOH Not Allowed", { status: 405 });
            if (request.method === 'POST' && !(allowed & 2)) return new Response("POST DOH Not Allowed", { status: 405 });
            
            return handleDOH(request, target, ctx, currentMode.cache_ttl);
        }

        // ---------------- [8. 构建转发请求头] ----------------
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
            headers.set('User-Agent', request.headers.get('User-Agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36');
        }

        if (target.hostname.includes('github.com')) {
            headers.set('X-Requested-With', 'XMLHttpRequest');
            headers.set('Accept', isApiCall ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
            if (isApiCall) headers.delete('Content-Type');
        }

        // ---------------- [9. 执行穿透代理请求] ----------------
        const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
        const upstream = await fetch(target, {
            method: request.method,
            headers,
            body: hasBody ? request.body : null,
            redirect: "manual"
        });

        // ---------------- [10. 源站 301/302 重定向沙箱改写] ----------------
        if (upstream.status >= 300 && upstream.status < 400 && upstream.headers.get("Location")) {
            const rawLoc = upstream.headers.get("Location");
            if (rawLoc.startsWith(url.origin + CONFIG.AUTH_PREFIX)) {
                return new Response(null, { status: upstream.status, headers: { "Location": rawLoc } });
            }

            const loc = new URL(rawLoc, target).href;
            let redirectPrefix = currentMode.set_path ? `${CONFIG.AUTH_PREFIX}/${currentMode.set_path}` : CONFIG.AUTH_PREFIX;
            const pathSegment = redirectPrefix + "/https/";
            const newLocation = url.origin + "/" + loc.replace(/^https?:\/\//i, pathSegment.slice(1));
            
            return new Response(null, { status: upstream.status, headers: { "Location": newLocation } });
        }

        // ---------------- [11. 响应头净化与安全解绑] ----------------
        const respHeaders = new Headers(upstream.headers);
        [
            "content-security-policy", "content-security-policy-report-only", "clear-site-data",
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
        let isHtmlActuallyOutput = originContentType.toLowerCase().includes("text/html") || ["html", "htm"].includes(extension) || currentMode.set_mime === 'text/html';

        // ---------------- [12. HTML 智能覆写判断分支] ----------------
        let shouldRewrite = false;
        if (currentMode.set_rewrite > 0 && isHtmlActuallyOutput) {
            if (currentMode.set_rewrite === 3) {
                shouldRewrite = true; 
            } else {
                const contentLengthHeader = upstream.headers.get("content-length");
                if (contentLengthHeader !== null) {
                    if (parseInt(contentLengthHeader, 10) <= currentMode.max_size * 1024) {
                        shouldRewrite = true; 
                    }
                } else if (currentMode.set_rewrite === 2) {
                    shouldRewrite = true; 
                }
            }
        }

        let responseFinal;
        if (shouldRewrite) {
            // 【🔥重大架构级重构】：采用原生流式 HTMLRewriter 处理，绝不发生 JSON 串改、闭合错乱，稳健度达 100%
            responseFinal = rewriteHtmlWithRewriter(upstream, currentMode, target, url, CONFIG);
        } else {
            responseFinal = new Response(upstream.body, { status: upstream.status, headers: respHeaders });
        }

        // ---------------- [13. 调用架构完全解耦的 MIME 修正器] ----------------
        const finalMime = fixContentType(currentMode, originContentType, extension, isHtmlActuallyOutput, MIME_MAP);
        if (finalMime) {
            responseFinal.headers.set("Content-Type", finalMime);
        } else {
            responseFinal.headers.delete("Content-Type");
        }

        // ---------------- [14. 注入统一缓存控制标头并输出] ----------------
        responseFinal.headers.set("Cache-Control", getCacheControl(currentMode.cache_ttl, false));
        return responseFinal;
    }
};

function getCacheControl(ttl, isDOH = false) {
    if (CONFIG.DEBUG_CACHE_MODE === 1) return "no-store, no-cache, must-revalidate, max-age=0";
    if (isDOH) return "no-cache, no-store, must-revalidate, max-age=0";
    if (typeof ttl === 'number' && ttl > 0) return `public, max-age=${ttl}, s-maxage=${ttl}, must-revalidate`;
    return "no-cache, no-store, must-revalidate, max-age=0";
}

// DOH 处理器
async function handleDOH(request, target, ctx, globalTtl) {
    const now = Date.now();
    const cacheKey = target.href;

    const memRecord = MEM_CACHE.get(cacheKey);
    if (memRecord && memRecord.expires > now) {
        return new Response(memRecord.bytes.slice(0), {
            status: 200,
            headers: { "Content-Type": "application/dns-message", "Access-Control-Allow-Origin": "*", "Cache-Control": getCacheControl(globalTtl, true) }
        });
    } else if (memRecord) {
        MEM_CACHE.delete(cacheKey);
    }

    if (request.method !== 'GET') {
        const dohHeaders = new Headers({ "Accept": "application/dns-message", "Content-Type": "application/dns-message" });
        dohHeaders.set('User-Agent', request.headers.get('User-Agent') || '');
        return fetch(target.href, { method: 'POST', headers: dohHeaders, body: request.body, redirect: "follow" });
    }

    let upstreamPromise = IN_FLIGHT_DOH.get(cacheKey);
    if (!upstreamPromise) {
        upstreamPromise = (async () => {
            try {
                const dohHeaders = new Headers({ "Accept": "application/dns-message" });
                dohHeaders.set('User-Agent', request.headers.get('User-Agent') || '');
                const res = await fetch(target.href, { method: 'GET', headers: dohHeaders, redirect: "follow" });
                if (res.status === 200) {
                    return { status: 200, bytes: new Uint8Array(await res.arrayBuffer()), errorText: null };
                }
                return { status: res.status, bytes: null, errorText: await res.text() };
            } catch (e) {
                return { status: 502, bytes: null, errorText: `Fetch Exception: ${e.message}` };
            } finally {
                IN_FLIGHT_DOH.delete(cacheKey);
            }
        })();
        IN_FLIGHT_DOH.set(cacheKey, upstreamPromise);
    }

    const result = await upstreamPromise;

    if (result.status === 200 && result.bytes) {
        if (MEM_CACHE.size >= CONFIG.MAX_MEM_CACHE) {
            const oldestKey = MEM_CACHE.keys().next().value;
            MEM_CACHE.delete(oldestKey);
        }
        MEM_CACHE.set(cacheKey, { bytes: result.bytes, expires: now + (globalTtl * 1000) });
        return new Response(result.bytes.slice(0), {
            status: 200,
            headers: { "Content-Type": "application/dns-message", "Access-Control-Allow-Origin": "*", "Cache-Control": getCacheControl(globalTtl, true) }
        });
    }
    return new Response(`[DOH Forwarder Error]\nStatus: ${result.status}\nMsg: ${result.errorText || 'None'}`, { status: result.status });
}

// MIME 智能裁决器
function fixContentType(currentMode, originContentType, extension, isHtmlActuallyOutput, MIME_MAP) {
    let finalMime = null;
    if (currentMode.set_mime === 'ORIGIN') {
        if (originContentType) finalMime = originContentType;
    } 
    else if (currentMode.set_mime === 'AUTO_MAP') {
        if (isHtmlActuallyOutput) {
            finalMime = "text/html; charset=utf-8";
        } else if (MIME_MAP.hasOwnProperty(extension)) {
            const mapMime = MIME_MAP[extension];
            const needsCharset = mapMime.startsWith('text/') || ['javascript', 'json'].some(k => mapMime.includes(k));
            finalMime = `${mapMime}${needsCharset ? "; charset=utf-8" : ""}`;
        }
    } 
    else if (currentMode.set_mime) {
        const baseMime = currentMode.set_mime;
        const needsCharset = baseMime.startsWith('text/') || ['javascript', 'json'].some(k => baseMime.includes(k));
        finalMime = `${baseMime}${needsCharset ? "; charset=utf-8" : ""}`;
    }
    if (!finalMime && originContentType) {
        finalMime = originContentType;
    }
    return finalMime;
}

// 【🔥全新重构架构】：HTMLRewriter 流式改写器 & 属性劫持分发
function rewriteHtmlWithRewriter(upstreamResponse, currentMode, target, url, CONFIG) {
    let rewritePrefix = currentMode.set_path ? `${CONFIG.AUTH_PREFIX}/${currentMode.set_path}` : CONFIG.AUTH_PREFIX;
    
    // 工具函数：计算并将 HTML 中的原路径规范映射至万能代理路径
    function convertUrl(rawUrl) {
        if (!rawUrl) return rawUrl;
        let trimUrl = rawUrl.trim();
        if (trimUrl.startsWith('data:') || trimUrl.startsWith('javascript:') || trimUrl.startsWith('#')) return rawUrl;
        
        // 排除已经带有反代前缀的地址，避免重复套娃
        if (trimUrl.includes(CONFIG.AUTH_PREFIX)) return rawUrl;

        try {
            let absoluteUrl = new URL(trimUrl, target.href).href;
            return url.origin + rewritePrefix + '/' + absoluteUrl.replace(/^https?:\/\//i, (m) => m.toLowerCase().startsWith('https') ? 'https/' : 'http/');
        } catch(e) {
            return rawUrl;
        }
    }

    // 定义流式属性覆写处理器
    class ElementAttributeRewriter {
        constructor(attributes) {
            this.attributes = attributes;
        }
        element(el) {
            for (let attr of this.attributes) {
                let val = el.getAttribute(attr);
                if (val) {
                    el.setAttribute(attr, convertUrl(val));
                }
            }
        }
    }

    // 实例化原生流式 HTML 重写核心，绝不伤害内联 script, style 及 JSON 内容
    const rewriter = new HTMLRewriter()
        .on('a', new ElementAttributeRewriter(['href', 'data-href', 'data-url', 'data-download', 'data-download-url']))
        .on('img', new ElementAttributeRewriter(['src', 'data-src', 'srcset']))
        .on('form', new ElementAttributeRewriter(['action']))
        .on('link', new ElementAttributeRewriter(['href']))
        .on('script', new ElementAttributeRewriter(['src']))
        .on('source', new ElementAttributeRewriter(['src', 'srcset']))
        .on('button', new ElementAttributeRewriter(['data-href', 'data-url', 'data-download', 'data-download-url', 'onclick']));

    // 高可靠性前端浏览器 Hook 沙箱注入机制 (注入在首部)
    const universalScript = `<script>
    (function(){
        if(window.__PROXY_INJECTED__) return;
        window.__PROXY_INJECTED__ = true;

        const authPrefix = "${CONFIG.AUTH_PREFIX}";
        const rewritePrefix = "${rewritePrefix}";
        const baseProxyPath = rewritePrefix + "/https/${target.hostname}";

        function rewriteUrl(u) {
            if (typeof u !== 'string') return u;
            let trimU = u.trim();
            if (!trimU || trimU.startsWith('data:') || trimU.startsWith('javascript:') || trimU.startsWith('#')) return u;
            if (trimU.includes(authPrefix)) return u;

            try {
                let absObj = new URL(trimU, window.location.href);
                let targetProtocolPart = absObj.protocol.startsWith('https') ? 'https/' : 'http/';
                return window.location.origin + rewritePrefix + '/' + targetProtocolPart + absObj.host + absObj.pathname + absObj.search + absObj.hash;
            } catch(e) {
                return u;
            }
        }

        const originalFetch = window.fetch; 
        window.fetch = (input, init) => {
            if (typeof input === 'string') input = rewriteUrl(input);
            else if (input instanceof Request) {
                input = new Request(rewriteUrl(input.url), input);
            }
            return originalFetch(input, init);
        };
        const originalXHR = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            if (typeof url === 'string') url = rewriteUrl(url);
            return originalXHR.call(this, method, url, ...args);
        };

        const originalPushState = history.pushState;
        history.pushState = function(state, title, url) {
            if (url && typeof url === 'string') url = rewriteUrl(url);
            return originalPushState.apply(this, [state, title, url]);
        };
        const originalReplaceState = history.replaceState;
        history.replaceState = function(state, title, url) {
            if (url && typeof url === 'string') url = rewriteUrl(url);
            return originalReplaceState.apply(this, [state, title, url]);
        };

        const originalSetAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name, value) {
            if (typeof value === 'string' && /^(href|src|action|data-url|data-href|data-download|data-download-url)$/i.test(name)) {
                value = rewriteUrl(value);
            }
            return originalSetAttribute.call(this, name, value);
        };

        const interceptAttrs = [
            { proto: HTMLAnchorElement.prototype, prop: 'href' },
            { proto: HTMLImageElement.prototype, prop: 'src' }
        ];
        interceptAttrs.forEach(({ proto, prop }) => {
            const desc = Object.getOwnPropertyDescriptor(proto, prop);
            if (desc && desc.set) {
                Object.defineProperty(proto, prop, {
                    get: desc.get,
                    set: function(val) {
                        return desc.set.call(this, rewriteUrl(val));
                    },
                    enumerable: desc.enumerable,
                    configurable: desc.configurable
                });
            }
        });

        const originalOpen = window.open;
        window.open = function(url, ...args) {
            if (typeof url === 'string') url = rewriteUrl(url);
            return originalOpen.call(window, url, ...args);
        };
    })();
    </script>`;

    const cleanHeaders = new Headers(upstreamResponse.headers);
    cleanHeaders.delete("content-security-policy");
    cleanHeaders.delete("x-frame-options");

    const transformedResponse = rewriter.on('head', {
        element(el) {
            el.prepend(universalScript, { html: true });
        }
    }).transform(upstreamResponse);

    return new Response(transformedResponse.body, {
        status: upstreamResponse.status,
        headers: cleanHeaders
    });
}

function getHelpHTML(origin) {
    const PANEL_TITLE = "CF 万能反代脚本 2026-07-08 (HTMLRewriter 架构重构版)";
    const IS_JUMP = 0; 

    const prefix = `${origin}${CONFIG.AUTH_PREFIX}`;
    const linkTarget = IS_JUMP === 1 ? "_blank" : "_self";

    const radiosHtml = Object.entries(CONFIG.ROUTE_REGISTRY).filter(([_, cfg]) => cfg.isMain).map(([key, cfg], i) => `<label><input type="radio" name="mode" value="${key}" ${i===0?'checked':''}> ${cfg.display_name}</label>`).join('');
    const mainExamplesHtml = Object.entries(CONFIG.ROUTE_REGISTRY).filter(([_, cfg]) => cfg.isMain).map(([key, cfg]) => { const currentPfx = cfg.set_path ? `${prefix}/${cfg.set_path}` : prefix; return `<p>• ${cfg.display_name}: <a href="${currentPfx}/https/github.com/2dust/v2rayN" target="${linkTarget}">${currentPfx}/https/...</a></p>`; }).join('');
    const forceMimeHtml = Object.entries(CONFIG.ROUTE_REGISTRY).filter(([_, cfg]) => !cfg.isMain).map(([key, cfg]) => { const currentPfx = `${prefix}/${cfg.set_path}/`; const rewriteTag = cfg.set_rewrite > 0 ? ` + 覆写[${cfg.set_rewrite}]` : ''; return `<p>• 强制 ${key.replace('is-', '').toUpperCase()}: <a href="${currentPfx}" target="${linkTarget}">${currentPfx}</a> <code>${cfg.set_mime}${rewriteTag}</code></p>`; }).join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${PANEL_TITLE}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;max-width:700px;margin:25px auto;padding:0 20px;color:#333;line-height:1.5}.panel{background:#f5f5f5;padding:12px;border-radius:6px;margin:15px 0}form{display:flex;margin-bottom:8px}input{flex:1;padding:7px;font-size:14px;border:1px solid #ccc;border-radius:4px 0 0 4px;outline:none}.btn{padding:7px 14px;color:#fff;border:none;cursor:pointer;font-size:14px}#btnGo{background:#0076ff;border-radius:0}#btnGo:hover{background:#005ecf}#btnJoin{background:#28a745;border-radius:0 4px 4px 0}#btnJoin:hover{background:#218838}label{margin-right:12px;font-size:13px;cursor:pointer}p{margin:3px 0;font-size:13px;word-break:break-all}a{color:#0076ff;text-decoration:none}a:hover{text-decoration:underline}code{background:#e8e8e8;padding:1px 3px;border-radius:3px;font-size:11px}.notice{margin-top:20px;padding:10px;background:#fff3cd;color:#856404;border:1px solid #ffeeba;border-radius:4px;font-size:12px}.result-card{display:none;background:#ffffff;border:1px solid #e0e0e0;border-left:5px solid #28a745;padding:12px;border-radius:4px;margin:15px 0;box-shadow:0 4px 6px rgba(0,0,0,0.08),0 1px 3px rgba(0,0,0,0.04)}.result-card .title{font-size:12px;color:#666;margin-bottom:4px;font-weight:bold}.result-card a{font-size:14px;color:#28a745;font-family:monospace;word-break:break-all}</style></head><body>
    <h3>${PANEL_TITLE}</h3>
    <div class="panel">
        <form id="proxyForm" onsubmit="return false;"><input type="text" id="urlInput" placeholder="输入目标 URL" required><button type="button" id="btnGo" class="btn">跳转</button><button type="button" id="btnJoin" class="btn">拼接</button></form>
        <div>${radiosHtml}</div>
    </div>
    <div id="resultArea" class="result-card"><div class="title">✨ 拼接成功的反代直链:</div><a id="resultLink" href="#" target="${linkTarget}"></a></div>
    <p><b>💡 核心模式示例：</b></p>${mainExamplesHtml}
    <p style="margin-top:12px"><b>🛠️ 强制 MIME 模式：</b></p>${forceMimeHtml}
    <div class="notice"><strong> DOH 风险：</strong> 使用 CF-Wokers / Snippets 部署时, 反代 DOH 极易快速消耗响应次数, 导致项目被艹. 反代目标必须使用合法域名格式, 如: https://dns.google/dns-query...</div>
    <script>
        const registry = ${JSON.stringify(CONFIG.ROUTE_REGISTRY)}; const prefix = '${prefix}';
        const IS_JUMP = ${IS_JUMP};

        function buildProxyUrl() {
            let u = document.getElementById('urlInput').value.trim(); if(!u) return null;
            const mode = document.querySelector('input[name="mode"]:checked').value;
            const pathPart = registry[mode].set_path; const prfx = pathPart ? (prefix + '/' + pathPart) : prefix;
            if(u.includes('${CONFIG.AUTH_PREFIX}')){ 
                u = u.split('${CONFIG.AUTH_PREFIX}')[1];
                Object.keys(registry).forEach(function(k) { if (registry[k].set_path && u.startsWith('/' + registry[k].set_path + '/')) u = u.substring(registry[k].set_path.length + 1); });
                u = u.replace(/^\\/+/, '');
            }
            if(/^https?:\\/\\//i.test(u)){ u = u.replace(/^https?:\\/\\//i, function(m){ return m.toLowerCase().replace('://', '/'); }); } else if(!/^https?\\//i.test(u)){ u = 'https/' + u; }
            return prfx + '/' + u;
        }

        document.getElementById('btnGo').addEventListener('click', function(e) {
            const targetUrl = buildProxyUrl(); if (!targetUrl) return;
            if (e.ctrlKey || e.metaKey) {
                window.open(targetUrl, '_blank');
                return;
            }            
            if (IS_JUMP === 1) {
                window.open(targetUrl, '_blank');
            } else {
                window.location.href = targetUrl;
            }
        });

        document.getElementById('btnJoin').addEventListener('click', function() {
            const targetUrl = buildProxyUrl(); if (targetUrl) {
                const resultArea = document.getElementById('resultArea'); const resultLink = document.getElementById('resultLink');
                resultLink.href = targetUrl; resultLink.textContent = targetUrl; resultArea.style.display = 'block';
            }
        });
    </script>
</body></html>`;
}