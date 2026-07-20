const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD', // 全局安全前缀
    DEBUG_CACHE_MODE: 0,             // 调试模式开关：0: 正常，1: 禁用所有缓存 (no-store)
    MAX_MEM_CACHE: 4096,             // 限制 DOH 本地内存缓存最大容量

    // DOH 白名单约束路径后缀
    DOH_PATHS: new Set(['/dns-query', '/dns-query-7788']),

    // ==================== 🚀 深度安全性与特性配置 ====================
    ENABLE_HOST_WHITELIST: 1,  // 上游 HOST 白名单开关：0: 关闭，1: 开启限制 (强烈建议开启防滥用)

    // 上游 HOST 注册表 & 纯 IP 自动域名映射字典
    // 当客户端请求纯 IP（如 8.8.8.8）时，自动映射转换为 CF 兼容的 SNI 域名，同时作为白名单
    DOH_HOST_REGISTRY: {
        '8.8.8.8': 'dns.google',
        '8.8.4.4': 'dns.google',
        'dns.google': 'dns.google',
        'dns.google.com': 'dns.google',
        
        '1.1.1.1': 'cloudflare-dns.com',
        '1.0.0.1': 'cloudflare-dns.com',
        'cloudflare-dns.com': 'cloudflare-dns.com',
        
        '9.9.9.9': 'dns.quad9.net',
        'dns.quad9.net': 'dns.quad9.net',

        '223.5.5.5': 'dns.alidns.com',
        '223.6.6.6': 'dns.alidns.com',
        'dns.alidns.com': 'dns.alidns.com'
    },

    // ==================== 🚀 性能优化功能开关 ====================
    ENABLE_SWR: 1,             // Stale-While-Revalidate 异步刷新开关：0: 关闭，1: 开启
    ENABLE_COMPRESSION: 1,     // 向上游请求启用压缩开关：0: 关闭，1: 开启 (节省长 Base64 流量)
    
    MEM_CACHE_TTL: 60,         // 【更名明确语义】纯 V8 内存成功响应的有效留存期（秒）
    SWR_TTL: 300,              // 允许内存缓存过期后，继续返回陈旧数据并异步刷新的容忍期（秒）
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

        // [4. 还原代理目标站点的真实 URL (接入 IP-SNI 映射逻辑)]
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

        // ✨【核心功能：纯 IP DoH 兼容转换与白名单校验】
        const rawHost = target.hostname.toLowerCase();
        const mappedHost = CONFIG.DOH_HOST_REGISTRY[rawHost];

        if (mappedHost) {
            // 如果命中注册表，不管客户端输入的是 IP 还是老域名，一律重写为 Cloudflare 支持的合法 SNI 域名
            target.hostname = mappedHost;
        } else if (CONFIG.ENABLE_HOST_WHITELIST === 1) {
            // 若开启了白名单且注册表未命中，直接熔断
            return new Response(`DOH Host Forbidden: ${rawHost}`, { status: 403 });
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

// 提取公共请求头 Object 构建，规避 new Headers() 的 GC 垃圾回收开销
function buildFetchOptions(method, hasCompression, bodyStream = null) {
    const headers = { "Accept": "application/dns-message" };
    if (method === 'POST') {
        headers["Content-Type"] = "application/dns-message";
    }
    if (hasCompression) {
        headers["Accept-Encoding"] = "br, gzip";
    }
    return {
        method: method,
        headers: headers,
        body: bodyStream,
        redirect: "follow",
        cf: { cacheEverything: false } // 💡 显式声明绕过 Cloudflare CDN Cache 组件
    };
}

// DOH 核心处理器
async function handleDOH(request, target, ctx) {
    const targetUrlStr = target.href;

    // POST 请求直接透传转发（绝不提前读取流，防坏 Body，绝不参与缓存）
    if (request.method !== 'GET') {
        const fetchOpts = buildFetchOptions('POST', CONFIG.ENABLE_COMPRESSION === 1, request.body);
        return fetch(targetUrlStr, fetchOpts);
    }

    const now = Date.now();

    // --- 🟢 【纯 V8 内存 LRU 淘汰层与 SWR 防抖机制】 ---
    if (CONFIG.DEBUG_CACHE_MODE !== 1) {
        const memRecord = MEM_CACHE.get(targetUrlStr);
        if (memRecord) {
            // 💡【优化方案：FIFO 改 O(1) 纯正 LRU】
            // 每次命中后先删再存，将热点节点移到 Map 的尾部，防止核心上游由于 FIFO 被误杀
            MEM_CACHE.delete(targetUrlStr);
            MEM_CACHE.set(targetUrlStr, memRecord);

            // A. 缓存完全在正常有效期内
            if (memRecord.expires > now) {
                return new Response(memRecord.bytes, {
                    status: 200,
                    headers: { "Content-Type": "application/dns-message", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0", "X-Cache-Status": "Hit" }
                });
            } 
            // B. 缓存处于 SWR 宽限期内
            else if (CONFIG.ENABLE_SWR === 1 && memRecord.swrExpires > now) {
                // 💡【优化方案：SWR 严格防抖拦截】
                // 如果当前正在处理该 URL 的上游请求，绝不重复生成 Promise，不重复调用 ctx.waitUntil
                if (!IN_FLIGHT_DOH.has(targetUrlStr)) {
                    const swrPromise = fetchAndCacheUpstream(targetUrlStr);
                    IN_FLIGHT_DOH.set(targetUrlStr, swrPromise);
                    ctx.waitUntil(swrPromise);
                }
                return new Response(memRecord.bytes, {
                    status: 200,
                    headers: { "Content-Type": "application/dns-message", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0", "X-Cache-Status": "SWR-Hit" }
                });
            } 
            // C. 彻底过期
            else {
                MEM_CACHE.delete(targetUrlStr);
            }
        }
    }

    // --- 🟡 并发独占锁控制（Cache Miss 时单例穿透） ---
    let upstreamPromise = IN_FLIGHT_DOH.get(targetUrlStr);
    if (!upstreamPromise) {
        upstreamPromise = fetchAndCacheUpstream(targetUrlStr);
        IN_FLIGHT_DOH.set(targetUrlStr, upstreamPromise);
    }

    const result = await upstreamPromise;

    if (result.status === 200 && result.bytes) {
        return new Response(result.bytes, {
            status: 200,
            headers: { "Content-Type": "application/dns-message", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0", "X-Cache-Status": "Miss" }
        });
    }
    
    return new Response(`[DOH Gateway Error]\nStatus: ${result.status}\nMsg: ${result.errorText || 'None'}`, { status: result.status });
}

// 向上游请求并回写内存缓存的公共封装函数
async function fetchAndCacheUpstream(targetUrlStr) {
    try {
        const fetchOpts = buildFetchOptions('GET', CONFIG.ENABLE_COMPRESSION === 1);
        const res = await fetch(targetUrlStr, fetchOpts);
        
        if (res.status === 200) {
            // 💡【优化方案：省去中间变量复制开销】
            // 直接由 ArrayBuffer 构建 Uint8Array，不进行 slice(0) 冗余深拷贝
            const bytes = new Uint8Array(await res.arrayBuffer());
            const now = Date.now();
            
            if (CONFIG.DEBUG_CACHE_MODE !== 1) {
                // LRU 容量限制防护
                if (MEM_CACHE.size >= CONFIG.MAX_MEM_CACHE) {
                    const oldestKey = MEM_CACHE.keys().next().value;
                    MEM_CACHE.delete(oldestKey);
                }
                
                MEM_CACHE.set(targetUrlStr, { 
                    bytes: bytes, 
                    expires: now + (CONFIG.MEM_CACHE_TTL * 1000),
                    swrExpires: now + ((CONFIG.MEM_CACHE_TTL + CONFIG.SWR_TTL) * 1000)
                });
            }

            return { status: 200, bytes: bytes, errorText: null };
        }
        return { status: res.status, bytes: null, errorText: `Upstream Status ${res.status}` };
    } catch (e) {
        return { status: 502, bytes: null, errorText: `Exception: ${e.message}` };
    } finally {
        IN_FLIGHT_DOH.delete(targetUrlStr);
    }
}