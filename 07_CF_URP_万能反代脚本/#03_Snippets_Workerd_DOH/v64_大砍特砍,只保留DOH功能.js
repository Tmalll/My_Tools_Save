const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD', // 全局安全前缀
    DEBUG_CACHE_MODE: 0,             // 调试模式开关：0: 正常，1: 禁用所有缓存 (no-store)
    MAX_MEM_CACHE: 2048,             // 限制 DOH 内存缓存最大容量，防止爆内存
    CACHE_TTL: 300,                  // DOH 缓存时间（秒）

    // DOH 白名单约束路径
    DOH_PATHS: new Set(['/dns-query', '/dns-query-7788']),
};

const MEM_CACHE = new Map();
const IN_FLIGHT_DOH = new Map();

export default {
    async fetch(request, env, ctx) {
        // [1. 本地 workerd 部署 NGX 反代专用协议修复层]
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
        
        // [2. 统一处理跨域预检 (CORS)]
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "*"
                }
            });
        }

        // [3. 基础前缀鉴权与路径剥离]
        const cleanPrefix = CONFIG.AUTH_PREFIX.replace(/^\/+|\/+$/g, '');
        let currentPath = url.pathname;
        
        if (currentPath.startsWith('/' + cleanPrefix + '/')) {
            // 剥离前缀，剩下类似: https/dns.google.com/dns-query 或 https://dns.google.com/dns-query
            currentPath = currentPath.substring(cleanPrefix.length + 1); 
        } else {
            return new Response("Unauthorized", { status: 403 });
        }

        // [4. 还原代理目标站点的真实 URL (极致兼容参数)]
        // 去除开头可能多余的斜杠
        currentPath = currentPath.replace(/^\/+/, '');
        
        let fullTargetStr = currentPath;
        if (/^https?[:\/]+/i.test(fullTargetStr)) {
            fullTargetStr = fullTargetStr.replace(/^https?[:\/]+/i, 'https://');
            if (currentPath.startsWith('http/')) fullTargetStr = fullTargetStr.replace(/^http[:\/]+/i, 'http://');
        } else {
            fullTargetStr = 'https://' + fullTargetStr;
        }

        let target;
        try {
            // 拼接上客户端传过来的原有 query 参数（核心：保留客户端发来的 ?dns=...）
            const finalTargetUrl = fullTargetStr + url.search + url.hash;
            target = new URL(finalTargetUrl);
        } catch (e) {
            return new Response("Invalid Proxy Format: " + e.message, { status: 400 });
        }

        // [5. DOH 白名单路径及方法边界安全校验]
        if (!CONFIG.DOH_PATHS.has(target.pathname)) {
            return new Response("DOH Path Forbidden: " + target.pathname, { status: 403 });
        }
        if (request.method !== 'GET' && request.method !== 'POST') {
            return new Response("Method Not Allowed", { status: 405 });
        }

        // [6. 执行 DOH 核心优化转发]
        return handleDOH(request, target, ctx, CONFIG.CACHE_TTL);
    }
};

function getCacheControl(ttl, isDOH = false) {
    if (CONFIG.DEBUG_CACHE_MODE === 1) return "no-store, no-cache, must-revalidate, max-age=0";
    if (isDOH) return "no-cache, no-store, must-revalidate, max-age=0";
    if (typeof ttl === 'number' && ttl > 0) return `public, max-age=${ttl}, s-maxage=${ttl}, must-revalidate`;
    return "no-cache, no-store, must-revalidate, max-age=0";
}

// DOH 核心处理器
async function handleDOH(request, target, ctx, globalTtl) {
    const now = Date.now();
    const cacheKey = target.href; // 包含完整的 ?dns= 路径作为缓存 Key

    // 1. 纯内存读取
    const memRecord = MEM_CACHE.get(cacheKey);
    if (memRecord && memRecord.expires > now) {
        return new Response(memRecord.bytes.slice(0), {
            status: 200,
            headers: { 
                "Content-Type": "application/dns-message", 
                "Access-Control-Allow-Origin": "*", 
                "Cache-Control": getCacheControl(globalTtl, true) 
            }
        });
    } else if (memRecord) {
        MEM_CACHE.delete(cacheKey);
    }

    // 2. POST 请求绝不走缓存，直接穿透转发
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

    // 4. 回写内存缓存并实施 FIFO 防护
    if (result.status === 200 && result.bytes) {
        if (MEM_CACHE.size >= CONFIG.MAX_MEM_CACHE) {
            const oldestKey = MEM_CACHE.keys().next().value;
            MEM_CACHE.delete(oldestKey);
        }

        MEM_CACHE.set(cacheKey, { bytes: result.bytes, expires: now + (globalTtl * 1000) });

        return new Response(result.bytes.slice(0), {
            status: 200,
            headers: { 
                "Content-Type": "application/dns-message", 
                "Access-Control-Allow-Origin": "*", 
                "Cache-Control": getCacheControl(globalTtl, true) 
            }
        });
    }
    
    return new Response(`[DOH Forwarder Error]\nStatus: ${result.status}\nMsg: ${result.errorText || 'None'}`, { status: result.status });
}