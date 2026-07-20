// ==================== 全局配置项 ====================
const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD',
    STATIC_PATH_PART: '/static/',
    ALLOW_POST_DOH: 0,              // 1:允许, 0:禁止
    DOH_CACHE_TTL: 30,              // DOH GET 缓存有效时间（秒）
    
    // 【新增控制变量】自适应防爆 HTML 重写限额
    MAX_REWRITE_SIZE: 15 * 1024 * 1024, // 15MB，大于此体积或没有 Content-Length 的 HTML 将强制熔断，转为流式转发
    
    // 功能开关
    ENABLE_DOH: true,
    ENABLE_STATIC: true,
    ENABLE_HTML_REWRITE: true,
    ENABLE_GITHUB_FIX: true,
    
    // DOH 自定义路径组
    DOH_PATHS: new Set(['/dns-query', '/dns-query-7788'])
};

// 全局内存热点缓存：用于 DOH 极速读取 (0ms 延迟)
const MEM_CACHE = new Map();

// 全局内存锁：用于 DOH 并发请求合并（Request Collapsing）
const IN_FLIGHT_DOH = new Map();

// 基础 MIME 映射（精简版）
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
    'xml': 'text/xml'
};

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const cleanPath = url.pathname.toLowerCase();
        
        // 1. 精准拦截无用图标/配置请求，不再盲目通过后缀名过滤，防止误杀正常图片
        if (cleanPath === '/favicon.ico' || 
            cleanPath === '/apple-touch-icon.png' || 
            cleanPath === '/apple-touch-icon-precomposed.png' || 
            cleanPath === '/site.webmanifest' || 
            cleanPath === '/browserconfig.xml' || 
            cleanPath.includes('android-chrome-')) {
            return new Response(null, { status: 204 });
        }

        // 2. 统一处理 OPTIONS 请求 (CORS 预检)
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

        // 拦截 url= 参数的快捷重定向
        const targetQueryUrl = url.searchParams.get('url');
        if (targetQueryUrl) {
            let targetPath = targetQueryUrl.replace(/^https?:\/\//i, '');
            return Response.redirect(url.origin + CONFIG.AUTH_PREFIX + '/https/' + targetPath, 302);
        }

        let path = url.pathname;
        const cleanPrefix = CONFIG.AUTH_PREFIX.replace(/^\/+|\/+$/g, '');
        let isStaticMode = false;

        // 鉴权与路由解析
        if (path === '/' + cleanPrefix || path === '/' + cleanPrefix + '/') {
            path = '/';
        } else if (path.startsWith('/' + cleanPrefix + '/')) {
            let subPath = path.substring(cleanPrefix.length + 1); 
            if (CONFIG.ENABLE_STATIC && subPath.startsWith(CONFIG.STATIC_PATH_PART)) {
                isStaticMode = true;
                path = subPath.substring(CONFIG.STATIC_PATH_PART.length - 1);
            } else {
                path = subPath;
            }
        } else {
            return new Response("Unauthorized", { status: 403 });
        }
        
        // 3. 渲染极致精简的主页
        if (path === '/' && url.search === '') {
            if (request.method === 'HEAD') {
                return new Response(null, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            }
            return new Response(getHelpHTML(url.origin), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }        
        
        // 自动纠正带双斜杠的访问
        if (path.startsWith("/https://") || path.startsWith("/http://")) {
            let fixedPath = path.replace(/:\/\//, "/"); 
            const currentPrefix = isStaticMode ? `${CONFIG.AUTH_PREFIX}/static` : CONFIG.AUTH_PREFIX;
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
                if (refererUrl.pathname.includes(CONFIG.STATIC_PATH_PART)) { startIndex += 1; }
                target = new URL(`${parts[startIndex]}://${parts[startIndex + 1]}/${targetPath}`);
            } catch (e) {
                return new Response("Error parsing referer", { status: 400 });
            }
        }
        else {
            return new Response("Invalid Proxy Format", { status: 400 });
        }

        // 4. DOH 独立模块处理
        if (CONFIG.ENABLE_DOH && CONFIG.DOH_PATHS.has(target.pathname)) {
            if (request.method === 'POST' && CONFIG.ALLOW_POST_DOH === 0) {
                return new Response("POST DOH Not Allowed", { status: 405 });
            }
            return handleDOH(request, target);
        }

        // 5. 通用反代请求头构建
        const headers = new Headers();
        request.headers.forEach((value, key) => {
            // 【优化】删除 Accept-Encoding 标头，让 CF 节点自主与源站进行压缩协商，降低 Worker 算力开销
            if (!/^(host|origin|referer|accept-encoding)$/i.test(key)) {
                headers.set(key, value.replace(url.origin, target.origin));
            }
        });

        headers.set("Host", target.hostname);
        headers.set("Referer", target.origin + "/");
        headers.set("Origin", target.origin);

        // UA 兜底逻辑优化，避免对已有 UA 的二次覆盖，逻辑更漂亮
        if (!headers.has('User-Agent')) {
            let userUA = request.headers.get('User-Agent');
            if (!userUA || userUA.trim() === "") {
                userUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';
            }
            headers.set('User-Agent', userUA);
        }

        // GitHub 特殊优化补丁
        if (CONFIG.ENABLE_GITHUB_FIX && target.hostname.includes('github.com')) {
            headers.set('X-Requested-With', 'XMLHttpRequest');
            headers.set('Accept', isApiCall ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
            if (isApiCall) headers.delete('Content-Type');
        }

        // 【优化】规范 HEAD 请求：如果是 HEAD 方法，显式将 body 设为 null，避免底层产生传输歧义
        const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

        // 发起请求
        const upstream = await fetch(target, {
            method: request.method,
            headers,
            body: hasBody ? request.body : null,
            redirect: "manual"
        });

        // 6. 修复：保持原有的重定向状态码 (301/302/307/308)，防止行为改变
        if (upstream.status >= 300 && upstream.status < 400 && upstream.headers.get("Location")) {
            const loc = new URL(upstream.headers.get("Location"), target).href;
            const currentPrefix = isStaticMode ? `${CONFIG.AUTH_PREFIX}/static` : CONFIG.AUTH_PREFIX;
            const pathSegment = currentPrefix + "/" + target.protocol.slice(0, -1) + "/";
            const newLocation = url.origin + "/" + loc.replace(/^https?:\/\//i, pathSegment.slice(1));
            
            return new Response(null, {
                status: upstream.status, 
                headers: { "Location": newLocation }
            });
        }

        // 进一步剥离更全面的安全响应头（新增 COOP 与 Origin-Agent-Cluster），彻底解放 iframe 限制
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

        // 7. 静态内容增强模式配置 (非熔断状态下的常规静态文件缓存映射)
        if (isStaticMode) {
            if (upstream.status >= 200 && upstream.status < 300) {
                const extMatch = target.pathname.match(/\.([a-zA-Z0-9]+)$/);
                const extension = extMatch ? extMatch[1].toLowerCase() : "";

                if (MIME_MAP.hasOwnProperty(extension)) {
                    const detectedMime = MIME_MAP[extension];
                    const charsetStr = detectedMime.startsWith('text/') || ['javascript', 'json'].some(k => detectedMime.includes(k)) ? "; charset=utf-8" : "";
                    respHeaders.set("Content-Type", `${detectedMime}${charsetStr}`);
                    respHeaders.set("Cache-Control", "max-age=31536000, public, immutable");
                } else {
                    respHeaders.set("Cache-Control", "max-age=86400, public");
                }
            } else {
                respHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
            }
        }

        // ==================== 8. 自适应防爆 HTML 重写模块 (极简稳定版) ====================
        const ct = upstream.headers.get("content-type") || "";
        const isHtml = ct.includes("text/html"); // 白名单拦截：仅处理 HTML 格式网页

        const contentLengthHeader = upstream.headers.get("content-length");
        const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;

        // 判决核心：只有在白名单内、明确能拿到大小、且小于等于设定阈值的 HTML 页面，才允许进入替换器
        if (CONFIG.ENABLE_HTML_REWRITE && isHtml && contentLength == null && contentLength <= CONFIG.MAX_REWRITE_SIZE) {
            
            // 黄金安全区：放心同步读取文本，并执行正则替换
            let html = await upstream.text();
            const currentPrefix = isStaticMode ? `${CONFIG.AUTH_PREFIX}/static` : CONFIG.AUTH_PREFIX;
            const simplePrefix = currentPrefix + "/" + target.protocol.slice(0, -1) + "/" + target.hostname;

            // 支持更全面的 HTML 标签属性替换（增加 srcset, poster, data-src）
            html = html.replace(/\b(href|src|action|data-url|data-pjax|data-turbo-frame|srcset|poster|data-src)=["']\/([^\/][^"']*)/gi, `$1="${simplePrefix}/$2"`);
            html = html.replace(new RegExp(target.origin.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '(?=[\/"\'])', 'gi'), simplePrefix);

            if (CONFIG.ENABLE_GITHUB_FIX && target.hostname.includes('github.com')) {
                const jsFixScript = `<script>(function(){const prefix="${simplePrefix}";const pathStart=window.location.pathname.substring(prefix.length).split('/').slice(0,3).join('/');function fixUrl(s){if(typeof s==='string'&&!s.startsWith(prefix)){if(s.startsWith(pathStart)&&pathStart.length>2){return prefix+s;}else if(s.startsWith('/_')){return prefix+s;}}return s;}const oFetch=window.fetch;window.fetch=function(i,n){if(typeof i==='string'){i=fixUrl(i);}return oFetch(i,n);};const oXhr=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u,...r){u=fixUrl(u);oXhr.call(this,m,u,...r);};})();</script>`;
                html = html.replace('</head>', jsFixScript + '</head>');
            }
            return new Response(html, { status: upstream.status, headers: respHeaders });
        }

        // ==================== 阶梯熔断与流式透传区 ====================        
        if (isStaticMode && isHtml) {
            if (upstream.status >= 200 && upstream.status < 300) {
                respHeaders.set("Content-Type", "text/html; charset=utf-8");
                respHeaders.set("Cache-Control", "max-age=31536000, public, immutable"); // 强缓存
            } else {
                respHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
            }
        }

        // 零内存消耗，高性能水管透传转发
        return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
    }
};

// ==================== 统一收拢模块：DOH 核心处理 ====================
async function handleDOH(request, target) {
    // 【优化】对于 POST DOH 采取最精简逻辑，不做锁，不做任何缓存，仅作单纯的透明反代转发
    if (request.method !== 'GET') {
        const dohHeaders = new Headers();
        dohHeaders.set("Accept", "application/dns-message");
        dohHeaders.set("Content-Type", "application/dns-message");
        dohHeaders.set('User-Agent', request.headers.get('User-Agent') || '');
        return fetch(target, { method: 'POST', headers: dohHeaders, body: request.body, redirect: "manual" });
    }

    // ---------- 以下进入高效 DOH GET 缓存调度中心 ----------
    const cache = caches.default;    
    const cacheKey = new Request(target.href, { method: 'GET' });

    // 【进阶方案一】一级缓存：Memory Cache (内存高速热点去重，0ms 延迟)
    const now = Date.now();
    const memRecord = MEM_CACHE.get(target.href);
    if (memRecord && memRecord.expires > now) {
        return memRecord.response.clone();
    } else if (memRecord) {
        MEM_CACHE.delete(target.href); // 过期手动清理
    }

    // 二级缓存：Cache API (分布式数据中心级缓存，带有微弱 I/O 延迟)
    let cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {        
        MEM_CACHE.set(target.href, {
            response: cachedResponse.clone(),
            expires: now + (CONFIG.DOH_CACHE_TTL * 1000)
        });
        return cachedResponse;
    }

    // 并发请求合并锁（Request Collapsing），防止 A / AAAA 并发引发的重复回源
    const lockKey = target.href;
    let upstreamPromise = IN_FLIGHT_DOH.get(lockKey);

    if (!upstreamPromise) {
        upstreamPromise = (async () => {
            try {
                const dohHeaders = new Headers();
                dohHeaders.set("Accept", "application/dns-message");
                dohHeaders.set('User-Agent', request.headers.get('User-Agent') || '');

                
                const res = await fetch(target, { method: 'GET', headers: dohHeaders, redirect: "manual" });
                if (res.status === 200) {
                    return { status: 200, body: await res.arrayBuffer() };
                }
                return { status: res.status, body: null };
            } catch {
                return { status: 502, body: null };
            } finally {
                IN_FLIGHT_DOH.delete(lockKey); // 释放并发锁
            }
        })();
        IN_FLIGHT_DOH.set(lockKey, upstreamPromise);
    }

    const result = await upstreamPromise;

    if (result.status === 200 && result.body) {
        const headers = new Headers({
            "Content-Type": "application/dns-message",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": `public, max-age=${CONFIG.DOH_CACHE_TTL}`
        });

        const responseToReturn = new Response(result.body, { status: 200, headers });
        
        // 异步写入缓存（不阻塞用户请求返回）
        ctx.waitUntil(cache.put(cacheKey, responseToReturn.clone()));

        
        // 写入全局内存，供后续超近距离极速命中
        MEM_CACHE.set(target.href, {
            response: responseToReturn.clone(),
            expires: now + (CONFIG.DOH_CACHE_TTL * 1000)
        });

        return responseToReturn;
    }


    return new Response("DOH Error", { status: result.status });

}

// ==================== 极简主页 HTML 模板 ====================
function getHelpHTML(origin) {
    const prefixNormal = `${origin}${CONFIG.AUTH_PREFIX}`; 
    const prefixStatic = `${origin}${CONFIG.AUTH_PREFIX}/static`; 
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Proxy Panel</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;max-width:700px;margin:30px auto;padding:0 20px;color:#333;line-height:1.6}form{display:flex;margin:10px 0 20px 0}input{flex:1;padding:8px;font-size:14px;border:1px solid #ccc;border-radius:4px 0 0 4px;outline:none}button{padding:8px 16px;background:#0076ff;color:#fff;border:none;border-radius:0 4px 4px 0;cursor:pointer}p{margin:4px 0;font-size:13px;word-break:break-all}a{color:#0076ff;text-decoration:none}a:hover{text-decoration:underline}.notice{margin-top:30px;padding:12px;background:#fff3cd;color:#856404;border:1px solid #ffeeba;border-radius:4px;font-size:13px}</style></head><body>
    <h3>Proxy Control Panel</h3>
    <b>普通模式 (RAW 原始模式):</b>
    <form id="formNormal"><input type="text" placeholder="输入目标 URL" required><button type="submit">Go!</button></form>
    <p>示例1: <a href="${prefixNormal}/https://github.com/2dust/v2rayN" target="_blank">${prefixNormal}/https://github.com/2dust/v2rayN</a></p>
    <p>示例2: <a href="${prefixNormal}/https/github.com/2dust/v2rayN" target="_blank">${prefixNormal}/https/github.com/2dust/v2rayN</a></p>
    <br><b>静态内容增强模式 (修正标头):</b>
    <form id="formStatic"><input type="text" placeholder="输入目标静态 URL" required><button type="submit">Go!</button></form>
    <p>示例1: <a href="${prefixStatic}/https://gist.githubusercontent.com/Tmalll/74f08eaff7dfdb21f547a71af2596498/raw/7.10.html" target="_blank">${prefixStatic}/https://gist.githubusercontent.com/Tmalll/74f08eaff7dfdb21f547a71af2596498/raw/7.10.html</a></p>
    <p>示例2: <a href="${prefixStatic}/https/gist.githubusercontent.com/Tmalll/74f08eaff7dfdb21f547a71af2596498/raw/7.10.html" target="_blank">${prefixStatic}/https/gist.githubusercontent.com/Tmalll/74f08eaff7dfdb21f547a71af2596498/raw/7.10.html</a></p>
    <div class="notice"><strong>⚠️ 风险提示：</strong><br>本系统已集成 DOH 反代与缓存模块。由于安全 DNS 会产生全天候极高频解析请求，长期挂载将<b>极其快速消耗</b>免费请求额度。建议仅作临时调试使用，以防额度耗尽导致 Worker 停摆。</div>
    <script>
        function setupForm(id, prfx) {
            document.getElementById(id).addEventListener('submit', function(e) {
                e.preventDefault();
                let u = this.querySelector('input').value.trim();
                if(!u) return;
                if(u.includes('${CONFIG.AUTH_PREFIX}')){ u = u.split('${CONFIG.AUTH_PREFIX}')[1].replace(/^\\/static\\//i, '/').replace(/^\\//, ''); }
                if(/^https?:\\/\\//i.test(u)){ u = u.replace(/^https?:\\/\\//i, function(m){ return m.toLowerCase().replace('://', '/'); }); } 
                else if(!/^https?\\//i.test(u)){ u = 'https/' + u; }
                window.open(prfx + '/' + u, '_blank');
            });
        }
        setupForm('formNormal', '${prefixNormal}');
        setupForm('formStatic', '${prefixStatic}');
    </script>
</body></html>`;
}