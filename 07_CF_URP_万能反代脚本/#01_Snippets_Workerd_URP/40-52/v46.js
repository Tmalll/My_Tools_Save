// Cloudflare Workers 和 Snippets 万能反代脚本
// ==================== 全局配置项 ====================
const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD',
    
    // 调试模式：0: 正常模式，1: 关闭所有缓存 (Cache-Control: no-store)
    DEBUG_CACHE_MODE: 0,  

    // DOH 约束设置
    DOH_PATHS: new Set(['/dns-query', '/dns-query-7788']),
    ALLOW_POST_DOH: 0,
    
    MAX_REWRITE_SIZE: 15 * 1024 * 1024,      // 15MB
    ENABLE_GITHUB_FIX: true,

    // ==================== 🛠️ 统一路由注册表 ====================
    // 规则：请求剥离安全前缀后的第一层路径匹配到哪个 key，就激活哪个模式。
    // mime 选项说明: 
    //   'ORIGIN': 不修改任何 MIME，保持源站 Content-Type (可保护多语言 charset 乱码)
    //   'AUTO_MAP': 根据后缀名匹配下面的 MIME_MAP 自适应纠正修正
    //   具体的字符串 (如 text/html): 强制指定该 MIME 类型
    ROUTE_REGISTRY: {
        'normal': { path: '', mime: 'ORIGIN', rewrite: true, ttl: 1800, cacheDesc: '30分钟缓存', isMain: true, name: '普通 (RAW)' },
        'static': { path: 'static', mime: 'AUTO_MAP', rewrite: true, ttl: 86400, cacheDesc: '1天缓存', isMain: true, name: 'Static 覆写' },
        'static_no_rewrite': { path: 'static_no_rewrite', mime: 'AUTO_MAP', rewrite: false, ttl: 604800, cacheDesc: '7天缓存', isMain: true, name: 'Static 长缓存' },
        'is-doh': { path: 'is-doh', mime: 'ORIGIN', rewrite: false, ttl: 300, cacheDesc: '5分钟缓存', isMain: true, name: '强制 DOH 反代' },
        
        // 强制 MIME 模式扩展 (非主按钮，自动渲染在下方的说明和可点击测试链接中)
        'is-html': { path: 'is-html', mime: 'text/html', rewrite: true, ttl: 86400, cacheDesc: '1天缓存' },
        'is-md': { path: 'is-md', mime: 'text/markdown', rewrite: false, ttl: 604800, cacheDesc: '7天缓存' },
        'is-markdown': { path: 'is-markdown', mime: 'text/markdown', rewrite: false, ttl: 604800, cacheDesc: '7天缓存' },
        'is-css': { path: 'is-css', mime: 'text/css', rewrite: false, ttl: 604800, cacheDesc: '7天缓存' },
        'is-js': { path: 'is-js', mime: 'application/javascript', rewrite: false, ttl: 604800, cacheDesc: '7天缓存' },
        'is-json': { path: 'is-json', mime: 'application/json', rewrite: false, ttl: 86400, cacheDesc: '1天缓存' },
        'is-txt': { path: 'is-txt', mime: 'text/plain', rewrite: false, ttl: 86400, cacheDesc: '1天缓存' },
        'is-xml': { path: 'is-xml', mime: 'text/xml', rewrite: false, ttl: 86400, cacheDesc: '1天缓存' },
        'is-csv': { path: 'is-csv', mime: 'text/csv', rewrite: false, ttl: 86400, cacheDesc: '1天缓存' }
    }
};

// 全局内存热点缓存
const MEM_CACHE = new Map();
const IN_FLIGHT_DOH = new Map();

// 基础 MIME 后缀映射表
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

// 辅助函数 - 生成缓存控制头 (完美联动配置表 TTL)
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
        
        // 1. 精准拦截无用图标/配置请求
        if (cleanPath === '/favicon.ico' || 
            cleanPath === '/apple-touch-icon.png' || 
            cleanPath === '/apple-touch-icon-precomposed.png' || 
            cleanPath === '/site.webmanifest' || 
            cleanPath === '/browserconfig.xml' || 
            cleanPath.includes('android-chrome-')) {
            return new Response(null, { status: 204 });
        }

        // 2. OPTIONS 跨域预检请求
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

        // 快捷 URL 参数重定向支持
        const targetQueryUrl = url.searchParams.get('url');
        if (targetQueryUrl) {
            let targetPath = targetQueryUrl.replace(/^https?:\/\//i, '');
            return Response.redirect(url.origin + CONFIG.AUTH_PREFIX + '/https/' + targetPath, 302);
        }

        // 3. 安全网关前缀校验与路由注册表提取
        const cleanPrefix = CONFIG.AUTH_PREFIX.replace(/^\/+|\/+$/g, '');
        let path = url.pathname;
        
        if (path === '/' + cleanPrefix || path === '/' + cleanPrefix + '/') {
            path = '/';
        } else if (path.startsWith('/' + cleanPrefix + '/')) {
            path = path.substring(cleanPrefix.length + 1); // 提取出类似 /static/https/... 或 /is-html/https/... 或 /https/...
        } else {
            return new Response("Unauthorized", { status: 403 });
        }

        // 核心路由解析：寻找第一级匹配标识
        let modeKey = 'normal';
        let subPath = path;
        const firstPart = path.split('/')[1]; // 由于最前方有 /，第一段在索引 1

        if (firstPart && CONFIG.ROUTE_REGISTRY[firstPart]) {
            modeKey = firstPart;
            subPath = path.substring(firstPart.length + 1); // 剥离匹配到的标识，剩下 /https/...
        }

        // 取出当前模式的最终配置对象
        const currentMode = CONFIG.ROUTE_REGISTRY[modeKey];

        // 4. 主页渲染 (当剥离前缀和标识符后路径为 '/' 且无参数)
        if (subPath === '/' && url.search === '') {
            if (request.method === 'HEAD') {
                return new Response(null, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            }
            return new Response(getHelpHTML(url.origin), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }        
        
        // 自动纠正目标 URL 的双斜杠错误 (如把 /https/ 拼错成了 /https://)
        if (subPath.startsWith("/https://") || subPath.startsWith("/http://")) {
            let fixedPath = subPath.replace(/:\/\//, "/");
            let redirectPrefix = currentMode.path ? `${CONFIG.AUTH_PREFIX}/${currentMode.path}` : CONFIG.AUTH_PREFIX;
            return Response.redirect(url.origin + redirectPrefix + fixedPath + url.search + url.hash, 302);
        }

        // 解析并校验远端目标
        let targetPath = subPath.slice(1) + url.search + url.hash;
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
                
                // 自动跳过路由注册表标记段，准确获取 Host 索引
                const secondPart = refererUrl.pathname.split('/')[startIndex + 1];
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

        // 5. 联动 DOH 模块判断 (包含旧逻辑匹配以及显式强制注册表 /is-doh 路由激活)
        if (modeKey === 'is-doh' || CONFIG.DOH_PATHS.has(target.pathname)) {
            if (request.method === 'POST' && CONFIG.ALLOW_POST_DOH === 0) {
                return new Response("POST DOH Not Allowed", { status: 405 });
            }
            return handleDOH(request, target, url, ctx, currentMode.ttl);
        }

        // 6. 通用远端反代请求头清洗构建
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

        if (CONFIG.ENABLE_GITHUB_FIX && target.hostname.includes('github.com')) {
            headers.set('X-Requested-With', 'XMLHttpRequest');
            headers.set('Accept', isApiCall ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
            if (isApiCall) headers.delete('Content-Type');
        }

        const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

        // 发起远端抓取
        const upstream = await fetch(target, {
            method: request.method,
            headers,
            body: hasBody ? request.body : null,
            redirect: "manual"
        });

        // 7. 远端重定向逻辑清洗补全
        if (upstream.status >= 300 && upstream.status < 400 && upstream.headers.get("Location")) {
            const loc = new URL(upstream.headers.get("Location"), target).href;
            let redirectPrefix = currentMode.path ? `${CONFIG.AUTH_PREFIX}/${currentMode.path}` : CONFIG.AUTH_PREFIX;
            const pathSegment = redirectPrefix + "/" + target.protocol.slice(0, -1) + "/";
            const newLocation = url.origin + "/" + loc.replace(/^https?:\/\//i, pathSegment.slice(1));
            
            return new Response(null, {
                status: upstream.status, 
                headers: { "Location": newLocation }
            });
        }

        // 8. 剥离不安全安全策略头并开启跨域
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
        // 🔄 注册表处理核心流：HTML 重写判定 + MIME 自适应修正 + 缓存自动绑定
        // ====================================================================
        const originContentType = upstream.headers.get("content-type") || "";
        const extMatch = target.pathname.match(/\.([a-zA-Z0-9]+)$/);
        const extension = extMatch ? extMatch[1].toLowerCase() : "";

        // 【安全防崩溃设计】：深度克隆原始响应流，在 Rewrite 异常时兜底返回，彻底杜绝 Body locked 错误
        const backupUpstream = upstream.clone(); 
        let responseBody = upstream.body;
        let rewriteSuccess = false;

        // 统一格式判别：优先校验源站 Content-Type，其次看物理后缀
        const isHtmlContent = originContentType.toLowerCase().includes("text/html") || ["html", "htm"].includes(extension);

        // 重写核心判定条件：100% 遵从注册表的配置及 MIME 映射规则
        let needsHtmlRewrite = false;
        if (currentMode.rewrite) {
            if (currentMode.mime === 'text/html') {
                needsHtmlRewrite = true; // 强行指定为 text/html 的模式强制执行重写
            } else if (currentMode.mime === 'ORIGIN' || currentMode.mime === 'AUTO_MAP') {
                needsHtmlRewrite = isHtmlContent; // 普通和静态模式下，只有检测到是 HTML 文件才允许执行重写判断
            }
        }

        const contentLengthHeader = upstream.headers.get("content-length");
        const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;
        const shouldRewrite = needsHtmlRewrite && (contentLength === null || contentLength <= CONFIG.MAX_REWRITE_SIZE);

        if (shouldRewrite) {
            try {
                let html = await upstream.text();
                let rewritePrefix = currentMode.path ? `${CONFIG.AUTH_PREFIX}/${currentMode.path}` : CONFIG.AUTH_PREFIX;
                const simplePrefix = rewritePrefix + "/" + target.protocol.slice(0, -1) + "/" + target.hostname;

                // 核心重写正则：动态植入当前选定的注册表分支路径
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

                // 万能框架修复注入脚本
                if (CONFIG.ENABLE_GITHUB_FIX && target.hostname.includes('github.com')) {
                    const githubFixScript = `<script>(function(){if(window.__GITHUB_PROXY_INJECTED__)return;window.__GITHUB_PROXY_INJECTED__=true;const prefix="${simplePrefix}";const pathStart=window.location.pathname.substring(prefix.length).split('/').slice(0,3).join('/');function fixUrl(s){if(typeof s==='string'&&!s.startsWith(prefix)){if(s.startsWith(pathStart)&&pathStart.length>2){return prefix+s;}else if(s.startsWith('/_')){return prefix+s;}}return s;}const oFetch=window.fetch;window.fetch=function(i,n){if(typeof i==='string'){i=fixUrl(i);}return oFetch(i,n);};const oXhr=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u,...r){u=fixUrl(u);return oXhr.call(this,m,u,...r);};})();</script>`;
                    html = html.includes('</head>') ? html.replace('</head>', githubFixScript + '</head>') : (html.includes('</body>') ? html.replace('</body>', githubFixScript + '\n</body>') : html + githubFixScript);
                }
                const universalFixScript = `<script>(function(){if(window.__UNIVERSAL_PROXY_INJECTED__)return;window.__UNIVERSAL_PROXY_INJECTED__=true;const prefix="${simplePrefix}";function isAlreadyProxied(url){if(typeof url!=='string')return false;return url.includes(prefix)||url.includes('${rewritePrefix}');}const oFetch=window.fetch;window.fetch=function(i,n){if(typeof i==='string'&&!isAlreadyProxied(i)&&i.startsWith('/_')){i=prefix+i;}return oFetch(i,n);};const oXhr=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u,...r){if(typeof u==='string'&&!isAlreadyProxied(u)&&u.startsWith('/_')){u=prefix+u;}return oXhr.call(this,m,u,...r);};})();</script>`;
                html = html.includes('</head>') ? html.replace('</head>', universalFixScript + '</head>') : (html.includes('</body>') ? html.replace('</body>', universalFixScript + '\n</body>') : html + universalFixScript);

                responseBody = html;
                rewriteSuccess = true;
            } catch (e) {
                console.error('[HTML Rewrite Error]', e.message);
                responseBody = backupUpstream.body; // 极端崩溃降级处理
                rewriteSuccess = false; 
            }
        }

        // ==================== 🛠️ 注册表 MIME 动态注入机制 ====================
        let finalMime = null;

        if (currentMode.mime === 'ORIGIN') {
            // 普通模式 / 强制DOH等模式：完美保持源站，坚决不改动或套用 utf-8 以保障防乱码效果
            if (originContentType) finalMime = originContentType;
        } 
        else if (currentMode.mime === 'AUTO_MAP') {
            // 静态覆写模式/长缓存模式：如果重写判定是 HTML，强覆 text/html。否则走后缀映射修正
            if (isHtmlContent) {
                finalMime = "text/html; charset=utf-8";
            } else if (MIME_MAP.hasOwnProperty(extension)) {
                const mapMime = MIME_MAP[extension];
                const needsCharset = mapMime.startsWith('text/') || ['javascript', 'json'].some(k => mapMime.includes(k));
                finalMime = `${mapMime}${needsCharset ? "; charset=utf-8" : ""}`;
            } else if (!rewriteSuccess && originContentType) {
                finalMime = originContentType; // 未能映射且未被重写，降级保留原标头
            }
        } 
        else {
            // 强制特定的 MIME 类型模式分支 (如 is-html, is-css 等)
            const baseMime = currentMode.mime;
            const needsCharset = baseMime.startsWith('text/') || ['javascript', 'json'].some(k => baseMime.includes(k));
            finalMime = `${baseMime}${needsCharset ? "; charset=utf-8" : ""}`;
        }

        if (finalMime) {
            respHeaders.set("Content-Type", finalMime);
        } else {
            respHeaders.delete("Content-Type");
        }

        // ==================== 🛠️ 注册表 100% 联动专属缓存机制 ====================
        respHeaders.set("Cache-Control", getCacheControl(currentMode.ttl));

        return new Response(responseBody, { status: upstream.status, headers: respHeaders });
    }
};

// ==================== DOH 核心高速处理函数 ====================
async function handleDOH(request, target, url, ctx, globalTtl) {
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

    // 内存热点缓存
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

    // 磁盘级默认缓存 Match
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

    // 并发请求合并锁防熔断
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
    return new Response(debugErrorMessage, { status: result.status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

// ==================== 🎨 完全自适应主页前端 HTML 模板 ====================
function getHelpHTML(origin) {
    const prefix = `${origin}${CONFIG.AUTH_PREFIX}`; 
    
    // 1. 根据底层数据注册表，自动过滤并抽取核心控制面板的按钮
    const radiosHtml = Object.entries(CONFIG.ROUTE_REGISTRY)
        .filter(([_, cfg]) => cfg.isMain)
        .map(([key, cfg], i) => {
            return `<label><input type="radio" name="mode" value="${key}" ${i===0?'checked':''}> ${cfg.name}</label>`;
        }).join('');

    // 2. 自动抽取并渲染核心模式的测试用例
    const mainExamplesHtml = Object.entries(CONFIG.ROUTE_REGISTRY)
        .filter(([_, cfg]) => cfg.isMain)
        .map(([key, cfg]) => {
            const currentPfx = cfg.path ? `${prefix}/${cfg.path}` : prefix;
            return `<p>• ${cfg.name} (${cfg.cacheDesc}): <a href="${currentPfx}/https/github.com/2dust/v2rayN" target="_blank">${currentPfx}/https/...</a></p>`;
        }).join('');

    // 3. 自动归类并渲染所有的扩展强制 MIME 模式 (100% 后端驱动，杜绝人工同步更新的麻烦)
    const forceMimeHtml = Object.entries(CONFIG.ROUTE_REGISTRY)
        .filter(([_, cfg]) => !cfg.isMain)
        .map(([key, cfg]) => {
            const currentPfx = `${prefix}/${cfg.path}`;
            const rewriteTag = cfg.rewrite ? ' + 自动覆写' : '';
            return `<p>• 强制 ${key.replace('is-', '').toUpperCase()}: <a href="${currentPfx}/https/example.com/file" target="_blank">${currentPfx}/https/...</a> <code>${cfg.mime}${rewriteTag} (${cfg.cacheDesc})</code></p>`;
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
    
    <p style="margin-top:12px"><b>🛠️ 强制 MIME 模式说明（以下示例均可点击直接测试）：</b></p>
    ${forceMimeHtml}

    <div class="notice">
        <strong>⚠️ DOH 风险提示与关键约束：</strong><br>
        安全 DNS 极易高频消耗免费请求额度。反代 DOH 目标<b>必须使用合法域名格式</b>（如 dns.google），严禁直接填写纯 IP（如 94.140.14.14），否则受 CF 架构反 SSRF 机制限制，将强制熔断并触发 error code: 1003 封禁。
    </div>

    <script>
        // 将主要模式的映射通过注册表动态下发给前端
        const registry = ${JSON.stringify(CONFIG.ROUTE_REGISTRY)};
        const prefix = '${prefix}';

        document.getElementById('proxyForm').addEventListener('submit', function(e) {
            e.preventDefault();
            let u = document.getElementById('urlInput').value.trim();
            if(!u) return;
            
            // 抓取当前主单选框选中的模式并计算出跳转路径
            const mode = document.querySelector('input[name="mode"]:checked').value;
            const pathPart = registry[mode].path;
            const prfx = pathPart ? (prefix + '/' + pathPart) : prefix;
            
            // 万能剥离器：彻底提取出干净的目标后缀
            if(u.includes('${CONFIG.AUTH_PREFIX}')){ 
                u = u.split('${CONFIG.AUTH_PREFIX}')[1].replace(/^\\/([^\\/]+)\\/i, '/').replace(/^\\//, ''); 
            }
            
            // 标准化协议分发
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