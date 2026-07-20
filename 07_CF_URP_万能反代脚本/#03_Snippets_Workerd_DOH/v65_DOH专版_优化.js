const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD', // 全局安全前缀
    DEBUG_CACHE_MODE: 0,             // 调试模式开关：0: 正常，1: 禁用所有缓存 (no-store)
    MAX_MEM_CACHE: 4096,             // 限制 DOH 内存缓存最大容量（调大到4096条条目）

    // DOH 白名单约束路径
    DOH_PATHS: new Set(['/dns-query', '/dns-query-7788']),

    // ==================== 🚀 性能优化功能开关 ====================
    ENABLE_SWR: 1,             // [4] Stale-While-Revalidate 异步刷新开关：0: 关闭，1: 开启
    ENABLE_COMPRESSION: 1,     // [5] 向上游请求启用压缩开关：0: 关闭，1: 开启 (节省长 Base64 流量)
    
    CACHE_TTL: 60,             // 标准成功响应的缓存时间（秒）
    SWR_TTL: 300,              // 允许缓存过期后，继续返回陈旧数据并异步刷新的容忍时间（秒）
};

// 纯 V8 高效进程内存高速缓存
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
            currentPath = currentPath.substring(cleanPrefix.length + 1); 
        } else {
            return new Response("Unauthorized", { status: 403 });
        }

        // [4. 还原代理目标站点的真实 URL]
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
            const finalTargetUrl = fullTargetStr + url.search + url.hash;
            target = new URL(finalTargetUrl);
        } catch (e) {
            return new Response("Invalid Proxy Format", { status: 400 });
        }

        // [5. DOH 白名单路径及方法边界安全校验]
        if (!CONFIG.DOH_PATHS.has(target.pathname)) {
            return new Response("DOH Path Forbidden: " + target.pathname, { status: 403 });
        }
        if (request.method !== 'GET' && request.method !== 'POST') {
            return new Response("Method Not Allowed", { status: 405 });
        }

        // [6. 执行 DOH 核心优化转发]
        return handleDOH(request, target, ctx);
    }
};

function getCacheControl(ttl, isDOH = false) {
    if (CONFIG.DEBUG_CACHE_MODE === 1) return "no-store, no-cache, must-revalidate, max-age=0";
    if (isDOH) return "no-cache, no-store, must-revalidate, max-age=0";
    if (typeof ttl === 'number' && ttl > 0) return `public, max-age=${ttl}, s-maxage=${ttl}, must-revalidate`;
    return "no-cache, no-store, must-revalidate, max-age=0";
}

// DOH 核心处理器
async function handleDOH(request, target, ctx) {
    // POST 请求直接穿透转发，完全不走缓存
    if (request.method !== 'GET') {
        const dohHeaders = new Headers({ "Accept": "application/dns-message", "Content-Type": "application/dns-message" });
        dohHeaders.set('User-Agent', request.headers.get('User-Agent') || '');
        if (CONFIG.ENABLE_COMPRESSION === 1) {
            dohHeaders.set('Accept-Encoding', 'br, gzip');
        }
        return fetch(target.href, { method: 'POST', headers: dohHeaders, body: request.body, redirect: "follow" });
    }

    const now = Date.now();
    const targetUrlStr = target.href;

    // --- 🟢 【纯 V8 内存高效缓存层与 SWR 控制】 ---
    if (CONFIG.DEBUG_CACHE_MODE !== 1) {
        const memRecord = MEM_CACHE.get(targetUrlStr);
        if (memRecord) {
            // A. 如果缓存在正常有效期内，直接切片内存秒回
            if (memRecord.expires > now) {
                return new Response(memRecord.bytes.slice(0), {
                    status: 200,
                    headers: { 
                        "Content-Type": "application/dns-message", 
                        "Access-Control-Allow-Origin": "*", 
                        "Cache-Control": getCacheControl(CONFIG.CACHE_TTL, true),
                        "X-Cache-Status": "Hit"
                    }
                });
            } 
            // B. 如果缓存过了标准 TTL，但在 SWR 的容忍期内
            else if (CONFIG.ENABLE_SWR === 1 && memRecord.swrExpires > now) {
                // 利用 ctx.waitUntil 在后台异步静默刷新上游，不让当前请求产生任何等待延迟
                ctx.waitUntil(fetchAndCacheUpstream(targetUrlStr));
                return new Response(memRecord.bytes.slice(0), {
                    status: 200,
                    headers: { 
                        "Content-Type": "application/dns-message", 
                        "Access-Control-Allow-Origin": "*", 
                        "Cache-Control": getCacheControl(CONFIG.CACHE_TTL, true), 
                        "X-Cache-Status": "SWR-Hit" 
                    }
                });
            } 
            // C. 完全过期，彻底删除
            else {
                MEM_CACHE.delete(targetUrlStr);
            }
        }
    }

    // --- 🟡 并发独占锁控制 ---
    let upstreamPromise = IN_FLIGHT_DOH.get(targetUrlStr);
    if (!upstreamPromise) {
        upstreamPromise = fetchAndCacheUpstream(targetUrlStr);
        IN_FLIGHT_DOH.set(targetUrlStr, upstreamPromise);
    }

    const result = await upstreamPromise;

    if (result.status === 200 && result.bytes) {
        return new Response(result.bytes.slice(0), {
            status: 200,
            headers: { 
                "Content-Type": "application/dns-message", 
                "Access-Control-Allow-Origin": "*", 
                "Cache-Control": getCacheControl(CONFIG.CACHE_TTL, true),
                "X-Cache-Status": "Miss"
            }
        });
    }
    
    return new Response(`[DOH Forwarder Error]\nStatus: ${result.status}\nMsg: ${result.errorText || 'None'}`, { status: result.status });
}

// 向上游请求并回写内存缓存的公共封装函数
async function fetchAndCacheUpstream(targetUrlStr) {
    try {
        const dohHeaders = new Headers({ "Accept": "application/dns-message" });
        dohHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        if (CONFIG.ENABLE_COMPRESSION === 1) {
            dohHeaders.set('Accept-Encoding', 'br, gzip');
        }

        const res = await fetch(targetUrlStr, { method: 'GET', headers: dohHeaders, redirect: "follow" });
        if (res.status === 200) {
            const buffer = await res.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            const now = Date.now();
            
            if (CONFIG.DEBUG_CACHE_MODE !== 1) {
                // FIFO 内存最大容量防护
                if (MEM_CACHE.size >= CONFIG.MAX_MEM_CACHE) {
                    const oldestKey = MEM_CACHE.keys().next().value;
                    MEM_CACHE.delete(oldestKey);
                }
                
                // 写入内存，同时算好标准过期时间与 SWR 异步刷新总宽限期
                MEM_CACHE.set(targetUrlStr, { 
                    bytes: bytes, 
                    expires: now + (CONFIG.CACHE_TTL * 1000),
                    swrExpires: now + ((CONFIG.CACHE_TTL + CONFIG.SWR_TTL) * 1000)
                });
            }

            return { status: 200, bytes: bytes, errorText: null };
        }
        return { status: res.status, bytes: null, errorText: `Upstream returned status ${res.status}` };
    } catch (e) {
        return { status: 502, bytes: null, errorText: `Fetch Exception: ${e.message}` };
    } finally {
        IN_FLIGHT_DOH.delete(targetUrlStr);
    }
}