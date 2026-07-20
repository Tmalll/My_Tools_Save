// Cloudflare Workers 和 Snippets 万能反代脚本
// ==================== 全局配置项 ====================
const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD',
    STATIC_PATH_PART: '/static/',
    STATIC_NO_REWRITE_PATH_PART: '/static_no_rewrite/',
    
    // ✅ 新增：调试模式
    DEBUG_CACHE_MODE: 0,  // 0: 正常模式，1: 关闭所有缓存

    // DOH 模式
    DOH_PATHS: new Set(['/dns-query', '/dns-query-7788']),
    ALLOW_POST_DOH: 0,
    DOH_CACHE_TTL: 300,
    
    // ✅ 缓存时间配置（秒）
    CACHE_TTL_NORMAL: 1800,                  // 30 分钟
    CACHE_TTL_STATIC_REWRITE: 86400,         // 1 天
    CACHE_TTL_STATIC_NO_REWRITE: 604800,     // 7 天
    MAX_REWRITE_SIZE: 15 * 1024 * 1024,      // 15MB
    
    ENABLE_DOH: true,
    ENABLE_STATIC: true,
    ENABLE_STATIC_NO_REWRITE: true,
    ENABLE_HTML_REWRITE: true,
    ENABLE_GITHUB_FIX: true,
    ENABLE_FORCE_MIME_MODE: true,  // ✅ 新增：强制 MIME 模式开关
    
    // ✅ 新增：强制 MIME 模式映射（is前缀 → MIME类型 + 是否需要覆写）
    FORCE_MIME_MODES: {
        'ishtml': { mime: 'text/html', rewrite: true },      // 强制 HTML 并覆写
        'ismd': { mime: 'text/markdown', rewrite: false },    // 强制 Markdown，不覆写
        'ismarkdown': { mime: 'text/markdown', rewrite: false },
        'iscss': { mime: 'text/css', rewrite: false },        // 强制 CSS，不覆写
        'isjs': { mime: 'application/javascript', rewrite: false },
        'isjson': { mime: 'application/json', rewrite: false },
        'istxt': { mime: 'text/plain', rewrite: false },
        'isxml': { mime: 'text/xml', rewrite: false },
        'iscsv': { mime: 'text/csv', rewrite: false },
    }
};

// 全局内存热点缓存
const MEM_CACHE = new Map();
const IN_FLIGHT_DOH = new Map();

// 基础 MIME 映射
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

// ✅ 新增：辅助函数 - 生成缓存控制头
function getCacheControl(ttl) {
    if (CONFIG.DEBUG_CACHE_MODE === 1) {
        return "no-store, no-cache, must-revalidate, max-age=0";
    }
    return ttl > 0 ? `max-age=${ttl}, public` : "no-cache, no-store, must-revalidate, max-age=0";
}

// ✅ 新增：辅助函数 - 从强制 MIME 模式提取信息
function parseForceMimeMode(subPath) {
    for (const [modeKey, modeConfig] of Object.entries(CONFIG.FORCE_MIME_MODES)) {
        const pattern = `${CONFIG.STATIC_PATH_PART}${modeKey}/`;
        if (subPath.startsWith(pattern)) {
            return {
                found: true,
                modeKey: modeKey,
                mime: modeConfig.mime,
                rewrite: modeConfig.rewrite,
                path: subPath.substring(pattern.length - 1)  // 保留前导 /
            };
        }
    }
    return { found: false };
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const cleanPath = url.pathname.toLowerCase();
        
        // 1. 精准拦截无用图标/配置请求
        if (cleanPath === '/favicon.ico' || 
            cleanPath === '/apple-touch-icon.png' || 
            cleanPath === '/apple-touch-icon-precomposed.png' || 
            cleanPath === '/site.webmanifest' || 
            cleanPath === '/browserconfig.xml' || 
            cleanPath.includes('android-chrome-')) {
            return new Response(null, { status: 204 });
        }

        // 2. OPTIONS 请求
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

        // 快捷重定向
        const targetQueryUrl = url.searchParams.get('url');
        if (targetQueryUrl) {
            let targetPath = targetQueryUrl.replace(/^https?:\/\//i, '');
            return Response.redirect(url.origin + CONFIG.AUTH_PREFIX + '/https/' + targetPath, 302);
        }

        let path = url.pathname;
        const cleanPrefix = CONFIG.AUTH_PREFIX.replace(/^\/+|\/+$/g, '');
        
        let proxyMode = 'normal';
        let isStaticMode = false;
        let isStaticNoRewriteMode = false;
        let forceMimeConfig = null; 

        // 鉴权与路由解析
        if (path === '/' + cleanPrefix || path === '/' + cleanPrefix + '/') {
            path = '/';
        } else if (path.startsWith('/' + cleanPrefix + '/')) {
            let subPath = path.substring(cleanPrefix.length + 1);
            
            // ✅ 优先匹配 /static_no_rewrite/
            if (CONFIG.ENABLE_STATIC_NO_REWRITE && subPath.startsWith(CONFIG.STATIC_NO_REWRITE_PATH_PART)) {
                isStaticNoRewriteMode = true;
                proxyMode = 'static_no_rewrite';
                path = subPath.substring(CONFIG.STATIC_NO_REWRITE_PATH_PART.length - 1);
            }
            // ✅ 新增：匹配动态强制 MIME 模式（如 /static/ishtml/ /static/ismd/ 等）
            else if (CONFIG.ENABLE_FORCE_MIME_MODE) {
                const mimeResult = parseForceMimeMode(subPath);
                if (mimeResult.found) {
                    isStaticMode = true;
                    forceMimeConfig = mimeResult;
                    proxyMode = 'static_force_mime';
                    path = mimeResult.path;
                }
                // 匹配普通 /static/
                else if (CONFIG.ENABLE_STATIC && subPath.startsWith(CONFIG.STATIC_PATH_PART)) {
                    isStaticMode = true;
                    proxyMode = 'static_rewrite';
                    path = subPath.substring(CONFIG.STATIC_PATH_PART.length - 1);
                }
                // 默认普通模式
                else {
                    path = subPath;
                }
            }
            // 匹配普通 /static/（如果强制 MIME 模式未启用）
            else if (CONFIG.ENABLE_STATIC && subPath.startsWith(CONFIG.STATIC_PATH_PART)) {
                isStaticMode = true;
                proxyMode = 'static_rewrite';
                path = subPath.substring(CONFIG.STATIC_PATH_PART.length - 1);
            } 
            // 默认普通模式
            else {
                path = subPath;
            }
        } else {
            return new Response("Unauthorized", { status: 403 });
        }
        
        // 3. 主页渲染
        if (path === '/' && url.search === '') {
            if (request.method === 'HEAD') {
                return new Response(null, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            }
            return new Response(getHelpHTML(url.origin), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }        
        
        // 自动纠正双斜杠
        if (path.startsWith("/https://") || path.startsWith("/http://")) {
            let fixedPath = path.replace(/:\/\//, "/");
            let currentPrefix = CONFIG.AUTH_PREFIX;
            if (forceMimeConfig) {
                currentPrefix = `${CONFIG.AUTH_PREFIX}${CONFIG.STATIC_PATH_PART}${forceMimeConfig.modeKey}`;
            } else if (isStaticMode) {
                currentPrefix = `${CONFIG.AUTH_PREFIX}/static`;
            } else if (isStaticNoRewriteMode) {
                currentPrefix = `${CONFIG.AUTH_PREFIX}/static_no_rewrite`;
            }
            return Response.redirect(url.origin + currentPrefix + fixedPath + url.search + url.hash, 302);
        }

        let targetPath = path.slice(1) + url.search + url.hash;
        if (!targetPath) return new Response("Missing target path", { status: 400 });

        let target;
        let referer = request.headers.get('Referer');
        let isApiCall = false;

        if (targetPath.startsWith("https/") || targetPath.startsWith("http/")) {
            let fullTarget = targetPath.replace(/^([a-z]+)\//, "$1://");
            try { target = new URL(fullTarget); } catch { return new Response("Invalid target URL", { status: 400 }); }
        }
        else if (referer && (targetPath.startsWith("_graphql") || targetPath.startsWith("_filter"))) {
            isApiCall = true;
            try {
                let refererUrl = new URL(referer);
                let refererPath = refererUrl.pathname.slice(1);
                let parts = refererPath.split('/');
                let startIndex = CONFIG.AUTH_PREFIX ? CONFIG.AUTH_PREFIX.split('/').length - 1 : 0;
                if (refererUrl.pathname.includes(CONFIG.STATIC_PATH_PART) || refererUrl.pathname.includes(CONFIG.STATIC_NO_REWRITE_PATH_PART)) { 
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

        // 4. DOH 模块
        if (CONFIG.ENABLE_DOH && CONFIG.DOH_PATHS.has(target.pathname)) {
            if (request.method === 'POST' && CONFIG.ALLOW_POST_DOH === 0) {
                return new Response("POST DOH Not Allowed", { status: 405 });
            }
            return handleDOH(request, target, url, ctx);
        }

        // 5. 通用反代请求头构建
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
            let userUA = request.headers.get('User-Agent');
            if (!userUA || userUA.trim() === "") {
                userUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';
            }
            headers.set('User-Agent', userUA);
        }

        if (CONFIG.ENABLE_GITHUB_FIX && target.hostname.includes('github.com')) {
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

        // 6. 处理重定向
        if (upstream.status >= 300 && upstream.status < 400 && upstream.headers.get("Location")) {
            const loc = new URL(upstream.headers.get("Location"), target).href;
            let currentPrefix = CONFIG.AUTH_PREFIX;
            if (forceMimeConfig) {
                currentPrefix = `${CONFIG.AUTH_PREFIX}${CONFIG.STATIC_PATH_PART}${forceMimeConfig.modeKey}`;
            } else if (isStaticMode) {
                currentPrefix = `${CONFIG.AUTH_PREFIX}/static`;
            } else if (isStaticNoRewriteMode) {
                currentPrefix = `${CONFIG.AUTH_PREFIX}/static_no_rewrite`;
            }
            const pathSegment = currentPrefix + "/" + target.protocol.slice(0, -1) + "/";
            const newLocation = url.origin + "/" + loc.replace(/^https?:\/\//i, pathSegment.slice(1));
            
            return new Response(null, {
                status: upstream.status, 
                headers: { "Location": newLocation }
            });
        }

        // 7. 剥离安全头
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

        // ====================================================================
        // 🔄 架构重构：优雅且彻底解耦的 4 阶段处理流
        // ====================================================================
        
        const originContentType = upstream.headers.get("content-type") || "";
        const extMatch = target.pathname.match(/\.([a-zA-Z0-9]+)$/);
        const extension = extMatch ? extMatch[1].toLowerCase() : "";

        // 【阶段 ①：流状态预准备（解决 Bug 7）】
        // 深度复制源站流，确保即使在 rewrite.text() 崩溃或出错时，也能保证降级返回原汁原味的 Body
        const backupUpstream = upstream.clone(); 
        let responseBody = upstream.body;
        let rewriteSuccess = false;

        // 【阶段 ②：独立判断并执行 HTML Rewrite（解决 Bug 4, 5, 6）】
        // 判断 HTML 统一标准：优先看 Content-Type 是否包含 text/html，其次看后缀名
        const isHtmlContent = originContentType.toLowerCase().includes("text/html") || ["html", "htm"].includes(extension);
        
        let needsHtmlRewrite = false;
        if (proxyMode === 'static_force_mime') {
            needsHtmlRewrite = forceMimeConfig.rewrite && forceMimeConfig.mime === 'text/html';
        } else if (proxyMode === 'normal' || proxyMode === 'static_rewrite') {
            needsHtmlRewrite = isHtmlContent; // 无论什么模式，只要符合 HTML 标准就允许重写判断
        }

        const contentLengthHeader = upstream.headers.get("content-length");
        const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;
        const shouldRewrite = CONFIG.ENABLE_HTML_REWRITE && needsHtmlRewrite && 
            (contentLength === null || contentLength <= CONFIG.MAX_REWRITE_SIZE);

        if (shouldRewrite) {
            try {
                let html = await upstream.text();
                let currentPrefix = CONFIG.AUTH_PREFIX;
                
                if (proxyMode === 'static_force_mime') {
                    currentPrefix = `${CONFIG.AUTH_PREFIX}${CONFIG.STATIC_PATH_PART}${forceMimeConfig.modeKey}`;
                } else if (proxyMode === 'static_rewrite') {
                    currentPrefix = `${CONFIG.AUTH_PREFIX}/static`;
                }
                
                const simplePrefix = currentPrefix + "/" + target.protocol.slice(0, -1) + "/" + target.hostname;

                // 正则替换
                html = html.replace(/\b(href|src|action|data-url|data-pjax|data-turbo-frame|srcset|poster|data-src)=["']\/([^\/][^"']*)/gi, `$1="${simplePrefix}/$2"`);
                html = html.replace(new RegExp(target.origin.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '(?=[\/"\'])', 'gi'), simplePrefix);
                html = html.replace(/\b(href|src|action)=["'](https?:\/\/[^"']+)/gi, (match, attr, urlStr) => {
                    try {
                        if (urlStr.includes(CONFIG.AUTH_PREFIX) || urlStr.includes(simplePrefix)) return match;
                        const urlObj = new URL(urlStr);
                        if (urlObj.origin === target.origin) {
                            return `${attr}="${simplePrefix}${urlObj.pathname + urlObj.search + urlObj.hash}"`;
                        } else {
                            return `${attr}="${url.origin}${currentPrefix}/${urlObj.protocol.slice(0, -1)}/${urlObj.hostname}${urlObj.pathname + urlObj.search + urlObj.hash}"`;
                        }
                    } catch { return match; }
                });

                // 脚本注入
                if (CONFIG.ENABLE_GITHUB_FIX && target.hostname.includes('github.com')) {
                    const githubFixScript = `<script>(function(){if(window.__GITHUB_PROXY_INJECTED__)return;window.__GITHUB_PROXY_INJECTED__=true;const prefix="${simplePrefix}";const pathStart=window.location.pathname.substring(prefix.length).split('/').slice(0,3).join('/');function fixUrl(s){if(typeof s==='string'&&!s.startsWith(prefix)){if(s.startsWith(pathStart)&&pathStart.length>2){return prefix+s;}else if(s.startsWith('/_')){return prefix+s;}}return s;}const oFetch=window.fetch;window.fetch=function(i,n){if(typeof i==='string'){i=fixUrl(i);}return oFetch(i,n);};const oXhr=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u,...r){u=fixUrl(u);return oXhr.call(this,m,u,...r);};})();</script>`;
                    html = html.includes('</head>') ? html.replace('</head>', githubFixScript + '</head>') : (html.includes('</body>') ? html.replace('</body>', githubFixScript + '\n</body>') : html + githubFixScript);
                }
                const universalFixScript = `<script>(function(){if(window.__UNIVERSAL_PROXY_INJECTED__)return;window.__UNIVERSAL_PROXY_INJECTED__=true;const prefix="${simplePrefix}";function isAlreadyProxied(url){if(typeof url!=='string')return false;return url.includes(prefix)||url.includes('${currentPrefix}');}const oFetch=window.fetch;window.fetch=function(i,n){if(typeof i==='string'&&!isAlreadyProxied(i)&&i.startsWith('/_')){i=prefix+i;}return oFetch(i,n);};const oXhr=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u,...r){if(typeof u==='string'&&!isAlreadyProxied(u)&&u.startsWith('/_')){u=prefix+u;}return oXhr.call(this,m,u,...r);};})();</script>`;
                html = html.includes('</head>') ? html.replace('</head>', universalFixScript + '</head>') : (html.includes('</body>') ? html.replace('</body>', universalFixScript + '\n</body>') : html + universalFixScript);

                responseBody = html;
                rewriteSuccess = true;
            } catch (e) {
                console.error('[HTML Rewrite Error]', e.message);
                // 即使失败，由于流被提前锁定，这里平滑降级使用克隆出来的备用流体，不影响后面的 MIME 修正逻辑
                responseBody = backupUpstream.body;
                rewriteSuccess = false; 
            }
        }

        if (proxyMode === 'normal') {
            if (originContentType) {
                respHeaders.set("Content-Type", originContentType);
            } else {
                respHeaders.delete("Content-Type");
            }
        }

        else if (proxyMode === 'static_rewrite' || proxyMode === 'static_force_mime') {
            // 静态覆盖模式 & 强力强制模式
            let targetMime = null;
            if (proxyMode === 'static_force_mime') {
                targetMime = forceMimeConfig.mime;
            } else if (proxyMode === 'static_rewrite') {
                // 如果是普通 static 且是 HTML，覆盖成 html；否则尝试后缀映射，映射不到则保持源站
                targetMime = isHtmlContent ? 'text/html' : (MIME_MAP[extension] || null);
            }

            if (targetMime) {
                const needsCharset = targetMime.startsWith('text/') || ['javascript', 'json'].some(k => targetMime.includes(k));
                respHeaders.set("Content-Type", `${targetMime}${needsCharset ? "; charset=utf-8" : ""}`);
            } else if (!rewriteSuccess && originContentType) {
                respHeaders.set("Content-Type", originContentType);
            }
        } 
        else if (proxyMode === 'static_no_rewrite') {
            // 静态长缓存无重写模式：仅根据后缀进行基础纠正
            if (upstream.status >= 200 && upstream.status < 300 && MIME_MAP.hasOwnProperty(extension)) {
                const detectedMime = MIME_MAP[extension];
                const needsCharset = detectedMime.startsWith('text/') || ['javascript', 'json'].some(k => detectedMime.includes(k));
                respHeaders.set("Content-Type", `${detectedMime}${needsCharset ? "; charset=utf-8" : ""}`);
            }
        }

        // 【阶段 ④：独立设置 Cache-Control 缓存控制】
        if (proxyMode === 'normal') {
            respHeaders.set("Cache-Control", getCacheControl(CONFIG.CACHE_TTL_NORMAL));
        } else if (proxyMode === 'static_no_rewrite') {
            respHeaders.set("Cache-Control", getCacheControl(CONFIG.CACHE_TTL_STATIC_NO_REWRITE));
        } else {
            respHeaders.set("Cache-Control", getCacheControl(CONFIG.CACHE_TTL_STATIC_REWRITE));
        }

        return new Response(responseBody, { status: upstream.status, headers: respHeaders });
    }
};

// ==================== DOH 处理函数 ====================
async function handleDOH(request, target, url, ctx) {
    if (request.method !== 'GET') {
        const dohHeaders = new Headers();
        dohHeaders.set("Accept", "application/dns-message");
        dohHeaders.set("Content-Type", "application/dns-message");
        dohHeaders.set('User-Agent', request.headers.get('User-Agent') || '');
        return fetch(target, { method: 'POST', headers: dohHeaders, redirect: "follow" });
    }

    const cache = caches.default;
    const cacheKey = new Request(target.href + url.search, { method: 'GET' });
    const now = Date.now();

    // 一级缓存
    const memRecord = MEM_CACHE.get(target.href);
    if (memRecord && memRecord.expires > now) {
        const headers = new Headers({
            "Content-Type": "application/dns-message",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": `public, max-age=${CONFIG.DOH_CACHE_TTL}`
        });
        return new Response(memRecord.bytes.slice(0), { status: 200, headers });
    } else if (memRecord) {
        MEM_CACHE.delete(target.href);
    }

    // 二级缓存
    let cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
        const cacheBuffer = await cachedResponse.arrayBuffer();
        const cacheBytes = new Uint8Array(cacheBuffer);
        MEM_CACHE.set(target.href, {
            bytes: cacheBytes,
            expires: now + (CONFIG.DOH_CACHE_TTL * 1000)
        });
        
        const headers = new Headers({
            "Content-Type": "application/dns-message",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": `public, max-age=${CONFIG.DOH_CACHE_TTL}`
        });
        return new Response(cacheBytes.slice(0), { status: 200, headers });
    }

    // 并发合并锁
    const lockKey = target.href;
    let upstreamPromise = IN_FLIGHT_DOH.get(lockKey);

    if (!upstreamPromise) {
        upstreamPromise = (async () => {
            try {
                const dohHeaders = new Headers();
                dohHeaders.set("Accept", "application/dns-message");                
                dohHeaders.set('User-Agent', request.headers.get('User-Agent') || '');
                dohHeaders.set("Host", target.hostname);

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
            "Cache-Control": `public, max-age=${CONFIG.DOH_CACHE_TTL}`
        });

        const responseToReturn = new Response(result.bytes.slice(0), { status: 200, headers });
        
        if (ctx && typeof ctx.waitUntil === 'function') {
            const responseToCache = new Response(result.bytes.slice(0), { status: 200, headers });
            ctx.waitUntil(cache.put(cacheKey, responseToCache));
        }

        MEM_CACHE.set(target.href, {
            bytes: result.bytes,
            expires: now + (CONFIG.DOH_CACHE_TTL * 1000)
        });

        return responseToReturn;
    }
    
    const debugErrorMessage = `[DOH Forwarder Error]\nTarget URL  : ${target.href}\nStatus Code : ${result.status}\nRaw Message : ${result.errorText || 'No explicit response body.'}`;
    return new Response(debugErrorMessage, { status: result.status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

// ==================== 极简主页 HTML 模板 ====================
function getHelpHTML(origin) {
    const prefixNormal = `${origin}${CONFIG.AUTH_PREFIX}`; 
    const prefixStatic = `${origin}${CONFIG.AUTH_PREFIX}/static`; 
    const prefixStaticNoRewrite = `${origin}${CONFIG.AUTH_PREFIX}/static_no_rewrite`;
    
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Proxy Panel</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;max-width:700px;margin:30px auto;padding:0 20px;color:#333;line-height:1.6}.panel{background:#f5f5f5;padding:15px;border-radius:6px;margin:20px 0}form{display:flex;margin-bottom:10px}input{flex:1;padding:8px;font-size:14px;border:1px solid #ccc;border-radius:4px 0 0 4px;outline:none}button{padding:8px 16px;background:#0076ff;color:#fff;border:none;border-radius:0 4px 4px 0;cursor:pointer}label{margin-right:15px;font-size:13px;cursor:pointer}p{margin:4px 0;font-size:13px;word-break:break-all}a{color:#0076ff;text-decoration:none}a:hover{text-decoration:underline}code{background:#e8e8e8;padding:1px 4px;border-radius:3px;font-size:12px}.notice{margin-top:25px;padding:12px;background:#fff3cd;color:#856404;border:1px solid #ffeeba;border-radius:4px;font-size:13px}.danger{color:#bd2130;font-weight:bold}</style></head><body>
    <h3>Proxy Control Panel</h3>
    
    <div class="panel">
        <form id="proxyForm">
            <input type="text" id="urlInput" placeholder="输入目标 URL (支持带前缀的二次过滤)" required>
            <button type="submit">Go!</button>
        </form>
        <div>
            <label><input type="radio" name="mode" value="normal" checked> 普通 (RAW)</label>
            <label><input type="radio" name="mode" value="static"> Static 覆写</label>
            <label><input type="radio" name="mode" value="static_no_rewrite"> Static 长缓存</label>
        </div>
    </div>

    <p><b>💡 模式示例链接：</b></p>
    <p>• 普通模式: <a href="${prefixNormal}/https://github.com/2dust/v2rayN" target="_blank">${prefixNormal}/https/github.com/...</a></p>
    <p>• Static 覆写: <a href="${prefixStatic}/https/gist.githubusercontent.com/Tmalll/74f08eaff7dfdb21f547a71af2596498/raw/7.10.html" target="_blank">${prefixStatic}/https/gist.githubusercontent.com/...</a></p>
    <p>• Static 长缓存: <a href="${prefixStaticNoRewrite}/https/example.com/style.css" target="_blank">${prefixStaticNoRewrite}/https/example.com/...</a></p>
    
    <p style="margin-top:15px"><b>🛠️ 强制 MIME 模式 (手动路由提示)：</b></p>
    <p>无需面板维护，直接在 <code>/static/</code> 或 <code>/static_no_rewrite/</code> 后面插入 <code>/[类型]/</code> 即可强制覆盖标头：</p>
    <p>• 强制 HTML: <code>${prefixStatic}/ishtml/https/pastebin.com/raw/xxx</code></p>
    <p>• 强制 JS: <code>${prefixStatic}/isjs/https/example.com/file.txt</code></p>
    <p>• 支持类型: <code>ishtml</code>(text/html) | <code>ismd</code>(text/markdown) | <code>iscss</code>(text/css) | <code>isjs</code>(javascript) | <code>isjson</code>(json) | <code>istxt</code>(plain)</p>

    <div class="notice">
        <strong>⚠️ 风险提示与约束：</strong><br>
        本系统集成 DOH 反代与缓存。安全 DNS 极易高频消耗免费额度，建议仅作临时调试。<br>
        <span class="danger">🚨 DOH 关键约束：反代 DOH 目标必须使用合法域名格式（如 dns.google），严禁填写纯 IP。否则受 Cloudflare 架构反 SSRF 机制限制，将强制熔断并触发 error code: 1003 封禁。</span>
    </div>

    <script>
        document.getElementById('proxyForm').addEventListener('submit', function(e) {
            e.preventDefault();
            let u = document.getElementById('urlInput').value.trim();
            if(!u) return;
            
            // 提取选中的前缀模式
            const mode = document.querySelector('input[name="mode"]:checked').value;
            let prfx = '${prefixNormal}';
            if (mode === 'static') prfx = '${prefixStatic}';
            if (mode === 'static_no_rewrite') prfx = '${prefixStaticNoRewrite}';
            
            // 过滤可能重复输入的代理前缀
            if(u.includes('${CONFIG.AUTH_PREFIX}')){ 
                u = u.split('${CONFIG.AUTH_PREFIX}')[1].replace(/^\\/(static_no_rewrite|static)\\//i, '/').replace(/^\\//, ''); 
            }
            
            // 格式化协议头
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