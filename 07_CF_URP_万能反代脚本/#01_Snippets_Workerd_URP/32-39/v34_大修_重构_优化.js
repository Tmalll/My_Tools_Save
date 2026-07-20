// ==================== 全局配置项 ====================
const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD',
    STATIC_PATH_PART: '/static/',
    ALLOW_POST_DOH: 0,          // 1:允许, 0:禁止
    
    // 功能开关
    ENABLE_DOH: true,
    ENABLE_STATIC: true,
    ENABLE_HTML_REWRITE: true,
    ENABLE_GITHUB_FIX: true,
    
    // DOH 自定义路径组
    DOH_PATHS: new Set(['/dns-query', '/dns-query-7788'])
};

// 全局内存锁：用于 DOH 并发请求合并（Request Collapsing）
const IN_FLIGHT_DOH = new Map();

// 基础 MIME 映射（精简版）
const MIME_MAP = {
    'css': 'text/css', 'htm': 'text/html', 'html': 'text/html',
    'js': 'application/javascript', 'mjs': 'application/javascript',
    'json': 'application/json', 'jsonld': 'application/ld+json',
    'md': 'text/markdown', 'markdown': 'text/markdown', 'xml': 'text/xml'
};

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // 1. 统一拦截所有杂七杂八的无用图标/配置请求，优雅返回 204
        const cleanPath = url.pathname.toLowerCase();
        if (cleanPath === '/favicon.ico' || 
            cleanPath.includes('apple-touch-icon') || 
            cleanPath.includes('android-chrome') || 
            cleanPath.endsWith('.png') || 
            cleanPath.endsWith('.ico')) {
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
            if (!/^(host|origin|referer)$/i.test(key)) {
                headers.set(key, value.replace(url.origin, target.origin));
            }
        });

        headers.set("Host", target.hostname);
        headers.set("Referer", target.origin + "/");
        headers.set("Origin", target.origin);

        // UA 全局透明透传与兜底
        let userUA = request.headers.get('User-Agent');
        if (!userUA || userUA.trim() === "") {
            userUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.87 Safari/537.36';
        }
        headers.set('User-Agent', userUA);

        // GitHub 特殊优化补丁
        if (CONFIG.ENABLE_GITHUB_FIX && target.hostname.includes('github.com')) {
            headers.set('X-Requested-With', 'XMLHttpRequest');
            headers.set('Accept', isApiCall ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
            if (isApiCall) headers.delete('Content-Type');
        }

        // 发起请求
        const upstream = await fetch(target, {
            method: request.method,
            headers,
            body: request.body,
            redirect: "manual"
        });

        // 6. 修复：保持原有的重定向状态码 (301/302/307/308)，防止行为改变
        if (upstream.status >= 300 && upstream.status < 400 && upstream.headers.get("Location")) {
            const loc = new URL(upstream.headers.get("Location"), target).href;
            const currentPrefix = isStaticMode ? `${CONFIG.AUTH_PREFIX}/static` : CONFIG.AUTH_PREFIX;
            const pathSegment = currentPrefix + "/" + target.protocol.slice(0, -1) + "/";
            const newLocation = url.origin + "/" + loc.replace(/^https?:\/\//i, pathSegment.slice(1));
            
            return new Response(null, {
                status: upstream.status, // 保持原状态码
                headers: { "Location": newLocation }
            });
        }

        // 剥离安全响应头，注入跨域
        const respHeaders = new Headers(upstream.headers);
        ["content-security-policy", "permissions-policy", "cross-origin-embedder-policy", "cross-origin-resource-policy", "x-frame-options", "x-content-type-options"].forEach(h => {
            respHeaders.delete(h);
            respHeaders.delete(h + "-report-only");
        });
        respHeaders.set("access-control-allow-origin", "*");

        // 7. 静态内容增强模式配置 (改用精简白名单机制)
        if (isStaticMode) {
            const extMatch = target.pathname.match(/\.([a-zA-Z0-9]+)$/);
            const extension = extMatch ? extMatch[1].toLowerCase() : "";

            if (MIME_MAP.hasOwnProperty(extension)) {
                const detectedMime = MIME_MAP[extension];
                // 仅限白名单里的文本格式自动补全 charset，二进制绝对不加
                const charsetStr = detectedMime.startsWith('text/') || ['javascript', 'json'].some(k => detectedMime.includes(k)) ? "; charset=utf-8" : "";
                respHeaders.set("Content-Type", `${detectedMime}${charsetStr}`);
                if (upstream.status >= 200 && upstream.status < 300) {
                    respHeaders.set("Cache-Control", "max-age=31536000, public, immutable");
                }
            } else {
                respHeaders.set("Cache-Control", "max-age=86400, public");
            }
        }

        // 8. HTML 内部链接重写补丁
        const ct = upstream.headers.get("content-type") || "";
        if (CONFIG.ENABLE_HTML_REWRITE && ct.includes("text/html")) {
            let html = await upstream.text();
            const currentPrefix = isStaticMode ? `${CONFIG.AUTH_PREFIX}/static` : CONFIG.AUTH_PREFIX;
            const simplePrefix = currentPrefix + "/" + target.protocol.slice(0, -1) + "/" + target.hostname;

            html = html.replace(/\b(href|src|action|data-url|data-pjax|data-turbo-frame)=["']\/([^\/][^"']*)/gi, `$1="${simplePrefix}/$2"`);
            html = html.replace(new RegExp(target.origin.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '(?=[\/"\'])', 'gi'), simplePrefix);

            if (CONFIG.ENABLE_GITHUB_FIX && target.hostname.includes('github.com')) {
                const jsFixScript = `<script>(function(){const prefix="${simplePrefix}";const pathStart=window.location.pathname.substring(prefix.length).split('/').slice(0,3).join('/');function fixUrl(s){if(typeof s==='string'&&!s.startsWith(prefix)){if(s.startsWith(pathStart)&&pathStart.length>2){return prefix+s;}else if(s.startsWith('/_')){return prefix+s;}}return s;}const oFetch=window.fetch;window.fetch=function(i,n){if(typeof i==='string'){i=fixUrl(i);}return oFetch(i,n);};const oXhr=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u,...r){u=fixUrl(u);oXhr.call(this,m,u,...r);};})();</script>`;
                html = html.replace('</head>', jsFixScript + '</head>');
            }
            return new Response(html, { status: upstream.status, headers: respHeaders });
        }

        return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
    }
};

// ==================== 统一收拢模块：DOH 核心处理 ====================
async function handleDOH(request, target) {
    const cache = caches.default;
    
    // GET 请求优先读 Cache API
    if (request.method === 'GET') {
        let cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;
    }

    const lockKey = `${request.method}:${target.href}`;
    let upstreamPromise = IN_FLIGHT_DOH.get(lockKey);

    if (!upstreamPromise) {
        upstreamPromise = (async () => {
            try {
                const dohHeaders = new Headers();
                dohHeaders.set("Accept", "application/dns-message");
                if (request.method === 'POST') dohHeaders.set("Content-Type", "application/dns-message");
                dohHeaders.set('User-Agent', request.headers.get('User-Agent') || 'Mozilla/5.0 Chrome/143.0.0.0');

                const res = await fetch(target, {
                    method: request.method,
                    headers: dohHeaders,
                    body: request.body,
                    redirect: "manual"
                });
                
                if (res.status === 200) {
                    return { status: 200, body: await res.arrayBuffer() };
                }
                return { status: res.status, body: null };
            } catch {
                return { status: 502, body: null };
            } finally {
                IN_FLIGHT_DOH.delete(lockKey); // 释放锁
            }
        })();
        IN_FLIGHT_DOH.set(lockKey, upstreamPromise);
    }

    const result = await upstreamPromise;

    if (result.status === 200 && result.body) {
        const headers = new Headers({
            "Content-Type": "application/dns-message",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": request.method === 'GET' ? "public, max-age=30" : "no-store"
        });

        const responseToReturn = new Response(result.body, { status: 200, headers });
        if (request.method === 'GET') {
            await cache.put(request, responseToReturn.clone()); // 写入高速缓存
        }
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