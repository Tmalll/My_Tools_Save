// Cloudflare Workers 和 Snippets 万能反代脚本 (Production Optimized Version)
// 核心演进：解决 DOH 301 环路、模块解耦、配置统一、无歧义命名、前端沙箱闭环

// ==================== 全局配置项 ====================
const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD', // 全局安全前缀
    DEBUG_CACHE_MODE: 0,             // 调试模式开关：0: 正常，1: 禁用所有缓存 (no-store)
    MAX_MEM_CACHE: 2048,             // 限制 DOH 内存缓存最大容量，防止爆内存

    // DOH 默认约束路径
    DOH_PATHS: new Set(['/dns-query', '/dns-query-7788']),

    // set_mime选项: 
    //    'ORIGIN' (保持源站) | 'AUTO_MAP' (后缀映射) | 强制指定MIME字符串 (如 text/html)
    // set_rewrite 智能覆写开关: 
    //    0: 关闭不覆写 | 1: 限有长度且<=max_size | 2: 允许<=max_size或无长度标头 | 3: 强制通通覆写
    // allow_doh 安全DNS开关: 
    //   0: 禁用 DOH | 1: 仅允许 GET (缓存) | 2: 仅允许 POST (不缓存) | 3: 同时允许 GET 和 POST
    // cache_ttl 缓存时间, 单位(秒).
    // ==================== 🛠️ 统一智能路由注册表 ====================
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

        // ---------------- [4. 基础前缀鉴权与路径剥离] ----------------
        const cleanPrefix = CONFIG.AUTH_PREFIX.replace(/^\/+|\/+$/g, '');
        let path = url.pathname;
        
        if (path === '/' + cleanPrefix || path === '/' + cleanPrefix + '/') {
            path = '/';
        } else if (path.startsWith('/' + cleanPrefix + '/')) {
            path = path.substring(cleanPrefix.length + 1); 
        } else {
            return new Response("Unauthorized", { status: 403 });
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

        // ---------------- [7. 🟢 DOH 安全隔离分流边界] ----------------
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
            const loc = new URL(upstream.headers.get("Location"), target).href;
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

        // 分析响应流基本特征
        const originContentType = upstream.headers.get("content-type") || "";
        const extMatch = target.pathname.match(/\.([a-zA-Z0-9]+)$/);
        const extension = extMatch ? extMatch[1].toLowerCase() : "";
        
        // 核心形态：上游返回的或者是我们根据策略预判它绝对是 HTML 的内容
        let isHtmlActuallyOutput = originContentType.toLowerCase().includes("text/html") || ["html", "htm"].includes(extension) || currentMode.set_mime === 'text/html';

        const backupUpstream = upstream.clone(); 
        let responseBody = upstream.body;

        // ---------------- [12. 📦 模块 A：HTML 智能覆写判断分支] ----------------
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

        if (shouldRewrite) {
            try {
                responseBody = await rewriteHtml(upstream, currentMode, target, url, CONFIG);
                isHtmlActuallyOutput = true; // 覆写成功，确认为 HTML 实体输出
            } catch (e) {
                console.error('[HTML Rewrite Failed, Fallback to Raw]', e.message);
                responseBody = backupUpstream.body; 
                isHtmlActuallyOutput = originContentType.toLowerCase().includes("text/html"); // 降级回源站形态
            }
        }

        // ---------------- [13. 📦 模块 B：调用架构完全解耦的 MIME 修正器] ----------------
        const finalMime = fixContentType(currentMode, originContentType, extension, isHtmlActuallyOutput, MIME_MAP);
        if (finalMime) {
            respHeaders.set("Content-Type", finalMime);
        } else {
            respHeaders.delete("Content-Type");
        }

        // ---------------- [14. 注入统一缓存控制标头并输出] ----------------
        respHeaders.set("Cache-Control", getCacheControl(currentMode.cache_ttl, false));
        return new Response(responseBody, { status: upstream.status, headers: respHeaders });
    }
};

function getCacheControl(ttl, isDOH = false) {
    if (CONFIG.DEBUG_CACHE_MODE === 1) return "no-store, no-cache, must-revalidate, max-age=0";
    if (isDOH) return "no-cache, no-store, must-revalidate, max-age=0";
    if (typeof ttl === 'number' && ttl > 0) return `public, max-age=${ttl}, s-maxage=${ttl}, must-revalidate`;
    return "no-cache, no-store, must-revalidate, max-age=0";
}

// ==================== DOH 处理器 (带先进 FIFO 容量熔断防护) ====================
async function handleDOH(request, target, ctx, globalTtl) {
    const now = Date.now();
    const cacheKey = target.href;

    // 1. 纯内存读取
    const memRecord = MEM_CACHE.get(cacheKey);
    if (memRecord && memRecord.expires > now) {
        return new Response(memRecord.bytes.slice(0), {
            status: 200,
            headers: { "Content-Type": "application/dns-message", "Access-Control-Allow-Origin": "*", "Cache-Control": getCacheControl(globalTtl, true) }
        });
    } else if (memRecord) {
        MEM_CACHE.delete(cacheKey);
    }

    // 2. POST 绝不走缓存
    if (request.method !== 'GET') {
        const dohHeaders = new Headers({ "Accept": "application/dns-message", "Content-Type": "application/dns-message" });
        dohHeaders.set('User-Agent', request.headers.get('User-Agent') || '');
        return fetch(target.href, { method: 'POST', headers: dohHeaders, body: request.body, redirect: "follow" });
    }

    // 3. GET 并发独占锁控制
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

    // 4. 回写内存缓存并实施 FIFO 强制边界限流防护
    if (result.status === 200 && result.bytes) {
        // 容量防护检查：如果超过上限，直接提出链表最头部（最旧的）数据
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

// ==================== 📦 模块 B：精简解耦的 MIME 智能裁决器 ====================
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
    
    // 同行提出的极端边缘完美兜底：如果算出来的 finalMime 是空的，但原站明明有 Content-Type，则必须保留源站，杜绝内容流失
    if (!finalMime && originContentType) {
        finalMime = originContentType;
    }

    return finalMime;
}

// ==================== 📦 模块 A：更强悍的 HTML 静态重写与全闭环沙箱 Hook 模块 ====================
async function rewriteHtml(upstreamResponse, currentMode, target, url, CONFIG) {
    let html = await upstreamResponse.text();
    let rewritePrefix = currentMode.set_path ? `${CONFIG.AUTH_PREFIX}/${currentMode.set_path}` : CONFIG.AUTH_PREFIX;
    const simplePrefix = url.origin + rewritePrefix + "/https/" + target.hostname;

    // 强化的正则匹配：通杀 href, src, action, data-url, pjax, poster, 以及现代前端高频的 meta content/data-href/data-srcset/imagesrcset 
    html = html.replace(/\b(href|src|action|data-url|data-pjax|data-turbo-frame|srcset|poster|data-src|data-href|data-srcset|imagesrcset|content)=["']\/([^\/][^"']*)/gi, `$1="${simplePrefix}/$2"`);
    html = html.replace(new RegExp(target.origin.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '(?=[\/"\'])', 'gi'), simplePrefix);
    
    html = html.replace(/\b(href|src|action|data-href)=["'](https?:\/\/[^"']+)/gi, (match, attr, urlStr) => {
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

    // 绝杀黑科技：追加前端 SPA（单页应用）专属路由拦截 Hook，杜绝 pushState 刷新导致 404 逃逸
    const universalScript = `<script>
    (function(){
        if(window.__PROXY_INJECTED__) return;
        window.__PROXY_INJECTED__ = true;
        const p = "${rewritePrefix}/https/${target.hostname}";
        
        function f(u){
            if(typeof u!=='string'||u.includes('${CONFIG.AUTH_PREFIX}')||u.includes(p)) return u;
            if((u.startsWith('/') && !u.startsWith('//')) || u.startsWith('/_')) return window.location.origin + p + u;
            return u;
        }
        
        // 1. 拦截基础异步数据包
        const oF = window.fetch; window.fetch = (i, n) => oF(typeof i==='string'?f(i):i, n);
        const oX = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(m, u, ...r){ return oX.call(this, m, typeof u==='string'?f(u):u, ...r); };
        
        // 2. 拦截单页应用无刷新路由跳转 (pushState / replaceState)，强制闭环锁在反代沙箱内
        const _pH = history.pushState;
        history.pushState = function(state, title, url) {
            if(url && typeof url === 'string') url = f(url);
            return _pH.apply(this, [state, title, url]);
        };
        const _rH = history.replaceState;
        history.replaceState = function(state, title, url) {
            if(url && typeof url === 'string') url = f(url);
            return _rH.apply(this, [state, title, url]);
        };
    })();
    </script>`;
    
    html = html.includes('</head>') ? html.replace('</head>', universalScript + '</head>') : (html.includes('</body>') ? html.replace('</body>', universalScript + '\n</body>') : html + universalScript);
    return html;
}

// 自动生成的前端控制面板
function getHelpHTML(origin) {
    const prefix = `${origin}${CONFIG.AUTH_PREFIX}`; 
    const radiosHtml = Object.entries(CONFIG.ROUTE_REGISTRY).filter(([_, cfg]) => cfg.isMain).map(([key, cfg], i) => `<label><input type="radio" name="mode" value="${key}" ${i===0?'checked':''}> ${cfg.display_name}</label>`).join('');
    const mainExamplesHtml = Object.entries(CONFIG.ROUTE_REGISTRY).filter(([_, cfg]) => cfg.isMain).map(([key, cfg]) => { const currentPfx = cfg.set_path ? `${prefix}/${cfg.set_path}` : prefix; return `<p>• ${cfg.display_name}: <a href="${currentPfx}/https/github.com/2dust/v2rayN" target="_blank">${currentPfx}/https/...</a></p>`; }).join('');
    const forceMimeHtml = Object.entries(CONFIG.ROUTE_REGISTRY).filter(([_, cfg]) => !cfg.isMain).map(([key, cfg]) => { const currentPfx = `${prefix}/${cfg.set_path}/`; const rewriteTag = cfg.set_rewrite > 0 ? ` + 覆写[${cfg.set_rewrite}]` : ''; return `<p>• 强制 ${key.replace('is-', '').toUpperCase()}: <a href="${currentPfx}" target="_blank">${currentPfx}</a> <code>${cfg.set_mime}${rewriteTag}</code></p>`; }).join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Proxy Panel</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;max-width:700px;margin:25px auto;padding:0 20px;color:#333;line-height:1.5}.panel{background:#f5f5f5;padding:12px;border-radius:6px;margin:15px 0}form{display:flex;margin-bottom:8px}input{flex:1;padding:7px;font-size:14px;border:1px solid #ccc;border-radius:4px 0 0 4px;outline:none}button{padding:7px 14px;background:#0076ff;color:#fff;border:none;border-radius:0 4px 4px 0;cursor:pointer}label{margin-right:12px;font-size:13px;cursor:pointer}p{margin:3px 0;font-size:13px;word-break:break-all}a{color:#0076ff;text-decoration:none}a:hover{text-decoration:underline}code{background:#e8e8e8;padding:1px 3px;border-radius:3px;font-size:11px}.notice{margin-top:20px;padding:10px;background:#fff3cd;color:#856404;border:1px solid #ffeeba;border-radius:4px;font-size:12px}</style></head><body>
    <h3>Proxy Control Panel</h3>
    <div class="panel">
        <form id="proxyForm"><input type="text" id="urlInput" placeholder="输入目标 URL" required><button type="submit">Go!</button></form>
        <div>${radiosHtml}</div>
    </div>
    <p><b>💡 核心模式示例：</b></p>${mainExamplesHtml}
    <p style="margin-top:12px"><b>🛠️ 强制 MIME 模式：</b></p>${forceMimeHtml}
    <div class="notice"><strong>⚠️ DOH 风险约束：</strong> 安全 DNS 极易高频消耗额度。反代目标必须使用合法域名格式（如 dns.google），严禁直接填写纯 IP，否则受反 SSRF 机制限制将强制熔断并触发 error code: 1003。</div>
    <script>
        const registry = ${JSON.stringify(CONFIG.ROUTE_REGISTRY)}; const prefix = '${prefix}';
        document.getElementById('proxyForm').addEventListener('submit', function(e) {
            e.preventDefault(); let u = document.getElementById('urlInput').value.trim(); if(!u) return;
            const mode = document.querySelector('input[name="mode"]:checked').value;
            const pathPart = registry[mode].set_path; const prfx = pathPart ? (prefix + '/' + pathPart) : prefix;
            if(u.includes('${CONFIG.AUTH_PREFIX}')){ 
                u = u.split('${CONFIG.AUTH_PREFIX}')[1];
                Object.keys(registry).forEach(function(k) { if (registry[k].set_path && u.startsWith('/' + registry[k].set_path + '/')) u = u.substring(registry[k].set_path.length + 1); });
                u = u.replace(/^\\/+/, '');
            }
            if(/^https?:\\/\\//i.test(u)){ u = u.replace(/^https?:\\/\\//i, function(m){ return m.toLowerCase().replace('://', '/'); }); } else if(!/^https?\\//i.test(u)){ u = 'https/' + u; }
            window.open(prfx + '/' + u, '_blank');
        });
    </script>
</body></html>`;
}