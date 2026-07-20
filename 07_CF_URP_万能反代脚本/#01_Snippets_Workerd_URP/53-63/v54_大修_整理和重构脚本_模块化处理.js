// Cloudflare Workers 和 Snippets 万能反代脚本
// 已知BUG, 
// DOH反代 dns.google.com 的时候301跳转有问题...
// mime: 'AUTO_MAP', 对应的Content-Type mime修正, 应该放到 rewrite模块 之外执行,

// ==================== 全局配置项 ====================
const CONFIG = {
    // 全局安全前缀, 作为鉴权使用
    AUTH_PREFIX: '/SP3eHm618kN71DD',
    
    // 调试模式开关：0: 正常模式，1: 关闭所有缓存 (Cache-Control: no-store)
    DEBUG_CACHE_MODE: 0,  

    // DOH 默认约束路径, 用来约束对公共DOH反代, 由allow_doh:0开关控制
    DOH_PATHS: new Set(['/dns-query', '/dns-query-7788']),

    // ==================== 🛠️ 统一智能路由注册表 ====================
    // mime选项: 'ORIGIN' (保持源站) | 'AUTO_MAP' (后缀映射) | 具体MIME字符串 (如 text/html)
    // rewrite 智能覆写开关: 
    //   0: 关闭不覆写 | 1: 限有长度且<=max_size | 2: 允许<=max_size或无长度标头 | 3: 强制通通覆写
    // allow_doh 安全DNS开关: 
    //   0: 禁用 DOH | 1: 仅允许 GET (缓存) | 2: 仅允许 POST (不缓存) | 3: 同时允许 GET 和 POST
    ROUTE_REGISTRY: {
        // 核心运行模式 (主控面板展示项)
        'normal':            { path: '',                  mime: 'ORIGIN',                 rewrite: 3, max_size: 15360, cache_ttl: 1800,   allow_doh: 3, isMain: true,  name: '普通 (RAW)' },
        'static':            { path: 'static',            mime: 'AUTO_MAP',               rewrite: 2, max_size: 10240, cache_ttl: 86400,  allow_doh: 0, isMain: true,  name: 'Static 覆写' },
        'static_no_rewrite': { path: 'static_no_rewrite', mime: 'AUTO_MAP',               rewrite: 0, max_size: 0,     cache_ttl: 604800, allow_doh: 0, isMain: true,  name: 'Static 长缓存' },
        'is-doh':            { path: 'is-doh',            mime: 'ORIGIN',                 rewrite: 0, max_size: 0,     cache_ttl: 300,    allow_doh: 1, isMain: false,  name: '强制 DOH (GET)' },
        'is-doh-post':       { path: 'is-doh-post',       mime: 'ORIGIN',                 rewrite: 0, max_size: 0,     cache_ttl: 0,      allow_doh: 2, isMain: false,  name: '强制 DOH (POST)' },
        
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









// ==================== 主要反代核心流程 ====================
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const cleanPath = url.pathname.toLowerCase();
        
        // ---------------- [1. 静态浏览器元数据快速熔断] ----------------
        if (cleanPath === '/favicon.ico' || 
            cleanPath === '/apple-touch-icon.png' || 
            cleanPath === '/apple-touch-icon-precomposed.png' || 
            cleanPath === '/site.webmanifest' || 
            cleanPath === '/browserconfig.xml' || 
            cleanPath.includes('android-chrome-')) {
            return new Response(null, { status: 204 });
        }

        // ---------------- [2. 统一处理跨域预检请求 OPTIONS] ----------------
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

        // ---------------- [3. URL 参数快捷重定向代理入口] ----------------
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

        // ---------------- [5. 智能路由注册表解析与匹配] ----------------
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

        // 如果访问空根路径，直接下发引导/配置主页
        if (subPath === '/' && url.search === '') {
            if (request.method === 'HEAD') {
                return new Response(null, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            }
            return new Response(getHelpHTML(url.origin), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }        

        // ---------------- [6. 还原代理目标站点的真实 URL 格式] ----------------
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

        
        // ---------------- [7. 🟢 DOH 专属安全隔离分流边界] ----------------
        if (CONFIG.DOH_PATHS.has(target.pathname)) {
            const allowed = currentMode.allow_doh;
            
            if (allowed === 0) {
                return new Response("DOH Service Forbidden In This Mode", { status: 403 });
            }
            
            if (request.method === 'GET' && !(allowed & 1)) {
                return new Response("GET DOH Not Allowed In This Mode", { status: 405 });
            }
            if (request.method === 'POST' && !(allowed & 2)) {
                return new Response("POST DOH Not Allowed In This Mode", { status: 405 });
            }
            // 鉴权通过，引入你修正后的纯内存无写锁 DOH 处理器
            return handleDOH(request, target, ctx, currentMode.cache_ttl);
        }

        // ---------------- [8. 构建转发请求头 (防环路与域名归一化)] ----------------
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

        // 针对特殊站点 (如 GitHub 异步接口) 的兼容性标头注入
        if (target.hostname.includes('github.com')) {
            headers.set('X-Requested-With', 'XMLHttpRequest');
            headers.set('Accept', isApiCall ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
            if (isApiCall) headers.delete('Content-Type');
        }

        // ---------------- [9. 执行真正的发包穿透 fetch] ----------------
        const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
        const upstream = await fetch(target, {
            method: request.method,
            headers,
            body: hasBody ? request.body : null,
            redirect: "manual" // 由反代脚本精准拦截和改写源站 301/302 重定向
        });

        // ---------------- [10. 源站 301/302 重定向沙箱改写] ----------------
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

        // ---------------- [11. 响应头净化 (解绑源站安全策略限制)] ----------------
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

        // 获取响应特征，为接下来的两个独立模块准备参数
        const originContentType = upstream.headers.get("content-type") || "";
        const extMatch = target.pathname.match(/\.([a-zA-Z0-9]+)$/);
        const extension = extMatch ? extMatch[1].toLowerCase() : "";
        const isHtmlContent = originContentType.toLowerCase().includes("text/html") || ["html", "htm"].includes(extension);

        const backupUpstream = upstream.clone(); 
        let responseBody = upstream.body;
        let rewriteSuccess = false;

        // ---------------- [12. 📦 模块 A：进入 HTML 独立覆写判断分支] ----------------
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

        // 如果符合重写机制条件，调用独立覆写函数
        if (shouldRewrite) {
            try {
                responseBody = await rewriteHtml(upstream, currentMode, target, url, CONFIG);
                rewriteSuccess = true;
            } catch (e) {
                console.error('[HTML Rewrite Error]', e.message);
                responseBody = backupUpstream.body; 
                rewriteSuccess = false; 
            }
        }

        // ---------------- [13. 📦 模块 B：调用独立 MIME 修正函数] ----------------
        // ✨ 【核心改变】：现在无论 rewrite 是 0 还是其它值，MIME 映射逻辑都会独立跑完
        const finalMime = fixContentType(currentMode, originContentType, extension, isHtmlContent, rewriteSuccess, MIME_MAP);

        if (finalMime) {
            respHeaders.set("Content-Type", finalMime);
        } else {
            respHeaders.delete("Content-Type");
        }

        // ---------------- [14. 注入统一缓存标头并输出] ----------------
        respHeaders.set("Cache-Control", getCacheControl(currentMode.cache_ttl));

        return new Response(responseBody, { status: upstream.status, headers: respHeaders });
    }
};

// 调试模式开关函数
function getCacheControl(ttl) {
    if (CONFIG.DEBUG_CACHE_MODE === 1) {
        return "no-store, no-cache, must-revalidate, max-age=0";
    }
    return ttl > 0 ? `public, max-age=${ttl}, s-maxage=${ttl}, must-revalidate` : "no-cache, no-store, must-revalidate, max-age=0";
}

// ==================== 修复后的 DOH 处理器 ====================
async function handleDOH(request, target, ctx, globalTtl) {
    const now = Date.now();
    const cacheKey = target.href;

    // 1. 优先使用纯内存缓存 (MEM_CACHE)，不消耗任何 CF 子请求额度，速度极快
    const memRecord = MEM_CACHE.get(cacheKey);
    if (memRecord && memRecord.expires > now) {
        const headers = new Headers({
            "Content-Type": "application/dns-message",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": `public, max-age=${globalTtl}`
        });
        return new Response(memRecord.bytes.slice(0), { status: 200, headers });
    } else if (memRecord) {
        MEM_CACHE.delete(cacheKey);
    }

    // 2. 针对 POST 请求：直接转发，绝不走缓存
    if (request.method !== 'GET') {
        const dohHeaders = new Headers();
        dohHeaders.set("Accept", "application/dns-message");
        dohHeaders.set("Content-Type", "application/dns-message");
        dohHeaders.set('User-Agent', request.headers.get('User-Agent') || '');
        return fetch(target.href, { method: 'POST', headers: dohHeaders, body: request.body, redirect: "follow" });
    }

    // 3. 针对 GET 请求：使用独占锁（In-flight Lock）防止激进并发击穿
    let upstreamPromise = IN_FLIGHT_DOH.get(cacheKey);

    if (!upstreamPromise) {
        upstreamPromise = (async () => {
            try {
                const dohHeaders = new Headers();
                dohHeaders.set("Accept", "application/dns-message");                
                dohHeaders.set('User-Agent', request.headers.get('User-Agent') || '');
                // 🟢 不锁死 Host 头，允许 dns.google.com 顺畅 301 跳转到 dns.google

                const res = await fetch(target.href, { method: 'GET', headers: dohHeaders, redirect: "follow" });
                if (res.status === 200) {
                    const rawBuffer = await res.arrayBuffer();
                    return { status: 200, bytes: new Uint8Array(rawBuffer), errorText: null };
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

    // 4. 返回结果并写入内存缓存（完全抛弃会引发 1101 的 cache.put）
    if (result.status === 200 && result.bytes) {
        const headers = new Headers({
            "Content-Type": "application/dns-message",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": `public, max-age=${globalTtl}` // 依靠标准 HTTP 标头让浏览器或下游客户端自行做客户端缓存
        });

        // 写入内存，供下一次高频请求复用
        MEM_CACHE.set(cacheKey, {
            bytes: result.bytes,
            expires: now + (globalTtl * 1000)
        });

        return new Response(result.bytes.slice(0), { status: 200, headers });
    }
    
    // 5. 错误兜底
    const debugErrorMessage = `[DOH Forwarder Error]\nTarget URL  : ${target.href}\nStatus Code : ${result.status}\nRaw Message : ${result.errorText || 'No explicit response body.'}`;
    return new Response(debugErrorMessage, { status: result.status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// 完全自适应主页前端
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

/**
 * 模块一：独立 MIME 修正函数 (fixContentType)
 * 职责：纯粹根据配置、源站标头和后缀名，计算并修正最终的 Content-Type
 */
function fixContentType(currentMode, originContentType, extension, isHtmlContent, rewriteSuccess, MIME_MAP) {
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
            // 如果未进行 HTML 覆写，且无后缀映射，则保留源站类型
            finalMime = originContentType; 
        }
    } 
    else if (currentMode.mime) {
        // 用户指定了具体的 MIME 字符串 (如 text/css)
        const baseMime = currentMode.mime;
        const needsCharset = baseMime.startsWith('text/') || ['javascript', 'json'].some(k => baseMime.includes(k));
        finalMime = `${baseMime}${needsCharset ? "; charset=utf-8" : ""}`;
    }
    
    return finalMime;
}

/**
 * 模块二：独立 HTML 智能覆写函数 (rewriteHtml)
 * 职责：纯粹解析 HTML 文本，重写静态资源相对路径、绝对路径，并注入万能 Hook 脚本
 */
async function rewriteHtml(upstreamResponse, currentMode, target, url, CONFIG) {
    let html = await upstreamResponse.text();
    let rewritePrefix = currentMode.path ? `${CONFIG.AUTH_PREFIX}/${currentMode.path}` : CONFIG.AUTH_PREFIX;
    const simplePrefix = url.origin + rewritePrefix + "/https/" + target.hostname;

    // 1. 覆写相对根路径 (如 href="/assets/style.css")
    html = html.replace(/\b(href|src|action|data-url|data-pjax|data-turbo-frame|srcset|poster|data-src)=["']\/([^\/][^"']*)/gi, `$1="${simplePrefix}/$2"`);
    
    // 2. 覆写指向源站原域名的绝对路径
    html = html.replace(new RegExp(target.origin.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '(?=[\/"\'])', 'gi'), simplePrefix);
    
    // 3. 覆写页面内嵌的其他第三方绝对超链接
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

    // 4. 动态注入前端 Fetch / XHR 万能拦截脚本
    const universalScript = `<script>(function(){if(window.__PROXY_INJECTED__)return;window.__PROXY_INJECTED__=true;const p="${rewritePrefix}/https/${target.hostname}";function f(u){if(typeof u!=='string'||u.includes('${CONFIG.AUTH_PREFIX}')||u.includes(p))return u;if((u.startsWith('/')&&!u.startsWith('//'))||u.startsWith('/_'))return window.location.origin+p+u;return u;}const oF=window.fetch;window.fetch=(i,n)=>oF(typeof i==='string'?f(i):i,n);const oX=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u,...r){return oX.call(this,m,typeof u==='string'?f(u):u,...r);};})();</script>`;
    
    html = html.includes('</head>') ? html.replace('</head>', universalScript + '</head>') : (html.includes('</body>') ? html.replace('</body>', universalScript + '\n</body>') : html + universalScript);

    return html;
}
