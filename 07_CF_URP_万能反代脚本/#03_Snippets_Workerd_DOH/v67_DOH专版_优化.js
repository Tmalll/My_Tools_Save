const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD', // 全局安全前缀
    DEBUG_CACHE_MODE: 0,             // 调试模式开关：0: 正常，1: 禁用所有缓存 (no-store)
    MAX_MEM_CACHE: 4096,             // 限制 DOH 本地内存缓存最大容量

    // DOH 约束路径后缀（白名单限制）
    DOH_PATHS: new Set(['/dns-query', '/dns-query-7788']),

    // ==================== 🚀 深度安全性与特性配置 ====================
    ENABLE_HOST_WHITELIST: 1,      // 上游 HOST 白名单开关：0: 关闭，1: 开启限制
    MAX_RESPONSE_SIZE_LIMIT: 8192,  // 异常响应熔断防护：超过 8KB 的畸形/错误包拒绝入内存缓存，防爆内存

    // 上游 HOST 注册表 & 纯 IP 自动域名映射字典（强制只存标准主机名，不带端口）
    DOH_HOST_REGISTRY: Object.freeze({
        // ====== 谷歌 (Google) ======
        '8.8.8.8': 'dns.google',
        '8.8.4.4': 'dns.google',
        'dns.google': 'dns.google',
        'dns.google.com': 'dns.google',
        
        // ====== 微软/CF (Cloudflare) ======
        '1.1.1.1': 'cloudflare-dns.com',
        '1.0.0.1': 'cloudflare-dns.com',
        'cloudflare-dns.com': 'cloudflare-dns.com',
        
        // ====== Quad9 ======
        '9.9.9.9': 'dns.quad9.net',
        'dns.quad9.net': 'dns.quad9.net',

        // ====== 阿里 (Alidns) ======
        '223.5.5.5': 'dns.alidns.com',
        '223.6.6.6': 'dns.alidns.com',
        'dns.alidns.com': 'dns.alidns.com',

        // ====== AdGuard 普通去广告 ======
        'dns.adguard-dns.com': 'dns.adguard-dns.com',
        'dns.adguard.com': 'dns.adguard.com',
        '94.140.14.14': 'dns.adguard-dns.com',
        '94.140.15.15': 'dns.adguard-dns.com',
        '2a10:50c0::ad1:ff': 'dns.adguard-dns.com',
        '[2a10:50c0::ad1:ff]': 'dns.adguard-dns.com',
        '2a10:50c0::ad2:ff': 'dns.adguard-dns.com',
        '[2a10:50c0::ad2:ff]': 'dns.adguard-dns.com',

        // ====== AdGuard 安全加强 ======
        'family.adguard-dns.com': 'family.adguard-dns.com',
        'dns-family.adguard.com': 'dns-family.adguard.com',
        '94.140.14.15': 'family.adguard-dns.com',
        '94.140.15.16': 'family.adguard-dns.com',
        '2a10:50c0::bad1:ff': 'family.adguard-dns.com',
        '[2a10:50c0::bad1:ff]': 'family.adguard-dns.com',
        '2a10:50c0::bad2:ff': 'family.adguard-dns.com',
        '[2a10:50c0::bad2:ff]': 'family.adguard-dns.com',

        // ====== AdGuard 无过滤版 ======
        'unfiltered.adguard-dns.com': 'unfiltered.adguard-dns.com',
        'dns-unfiltered.adguard.com': 'dns-unfiltered.adguard.com',
        '94.140.14.140': 'unfiltered.adguard-dns.com',
        '94.140.14.141': 'unfiltered.adguard-dns.com',
        '2a10:50c0::1:ff': 'unfiltered.adguard-dns.com',
        '[2a10:50c0::1:ff]': 'unfiltered.adguard-dns.com',
        '2a10:50c0::2:ff': 'unfiltered.adguard-dns.com',
        '[2a10:50c0::2:ff]': 'unfiltered.adguard-dns.com',

        // ====== DNS.SB 全球主节点 ======
        'doh.dns.sb': 'doh.dns.sb',
        'doh.sb': 'doh.sb',
        'dns.sb': 'dns.sb',
        '185.222.222.222': 'doh.dns.sb',
        '45.11.45.11': 'doh.dns.sb',
        '2a09::': 'doh.dns.sb',
        '[2a09::]': 'doh.dns.sb',
        '2a11::': 'doh.dns.sb',
        '[2a11::]': 'doh.dns.sb',

        // ====== DNS.SB 区域分流节点 ======
        'de-dus.doh.sb': 'de-dus.doh.sb',
        'de-fra.doh.sb': 'de-fra.doh.sb',
        'nl-ams.doh.sb': 'nl-ams.doh.sb',
        'uk-lon.doh.sb': 'uk-lon.doh.sb',
        'ee-tll.doh.sb': 'ee-tll.doh.sb',
        'jp-kix.doh.sb': 'jp-kix.doh.sb',
        'jp-nrt.doh.sb': 'jp-nrt.doh.sb',
        'hk-hkg.doh.sb': 'hk-hkg.doh.sb',
        'au-syd.doh.sb': 'au-syd.doh.sb',
        'us-chi.doh.sb': 'us-chi.doh.sb',
        'us-nyc.doh.sb': 'us-nyc.doh.sb',
        'us-sjc.doh.sb': 'us-sjc.doh.sb',
        'in-blr.doh.sb': 'in-blr.doh.sb',
        'sg-sin.doh.sb': 'sg-sin.doh.sb',
        'kr-sel.doh.sb': 'kr-sel.doh.sb',
        'ru-mow.doh.sb': 'ru-mow.doh.sb',
        'ca-yyz.doh.sb': 'ca-yyz.doh.sb',
        'de-ber.doh.sb': 'de-ber.doh.sb',

        // ====== 日本 IIJ 公共 DNS ======
        'public.dns.iij.jp': 'public.dns.iij.jp',
        '103.2.57.6': 'public.dns.iij.jp',
        '103.2.57.5': 'public.dns.iij.jp',
        '2001:300::5': 'public.dns.iij.jp',
        '[2001:300::5]': 'public.dns.iij.jp',
        '2001:300::6': 'public.dns.iij.jp',
        '[2001:300::6]': 'public.dns.iij.jp'
    }),

    // ==================== 🚀 性能与缓存抖动配置 ====================
    ENABLE_SWR: 1,                 // Stale-While-Revalidate 异步刷新开关
    ENABLE_COMPRESSION: 0,         // 向上游请求启用压缩开关：DoH 包极小，压缩反而增加体积和 CPU 损耗
    
    MEM_CACHE_TTL: 600,            // 纯 V8 内存成功响应的有效留存期（秒）
    SWR_TTL: 300,                  // 允许缓存过期后，继续返回陈旧数据并异步刷新的容忍期（秒）
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

        // 【Host 映射与清洗】提取原始 hostname 并在注册表中匹配重写
        const rawHost = target.hostname.toLowerCase();
        const mappedHost = CONFIG.DOH_HOST_REGISTRY[rawHost];

        if (mappedHost) {
            target.hostname = mappedHost;
        } else if (CONFIG.ENABLE_HOST_WHITELIST === 1) {
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

// 向上游转发公共请求选项构建
function buildFetchOptions(method, hasCompression, bodyStream = null) {
    const headers = { "Accept": "application/dns-message" };
    if (method === 'POST') headers["Content-Type"] = "application/dns-message";
    if (hasCompression) headers["Accept-Encoding"] = "br, gzip";
    
    return {
        method: method,
        headers: headers,
        body: bodyStream,
        redirect: "follow",
        cf: { cacheEverything: false } // 显式隔离 CDN 缓存组件
    };
}

// DOH 核心处理器
async function handleDOH(request, target, ctx) {
    const targetUrlStr = target.href;

    // POST 请求直接流式穿透转发（严格不提前读 Body，防流闭合损坏）
    if (request.method !== 'GET') {
        return fetch(targetUrlStr, buildFetchOptions('POST', CONFIG.ENABLE_COMPRESSION === 1, request.body));
    }

    const now = Date.now();

    // --- 🟢 【纯 V8 内存高效 LRU 缓存层与 SWR 机制】 ---
    if (CONFIG.DEBUG_CACHE_MODE !== 1) {
        const memRecord = MEM_CACHE.get(targetUrlStr);
        if (memRecord) {
            // 【LRU 刷新位置】每次命中后从 Map 头部移至尾部，确保热点记录高活
            MEM_CACHE.delete(targetUrlStr);
            MEM_CACHE.set(targetUrlStr, memRecord);

            // A. 命中有效期（包含消极缓存和正常缓存）
            if (memRecord.expires > now) {
                return new Response(new Uint8Array(memRecord.buffer), {
                    status: memRecord.status,
                    headers: { 
                        "Content-Type": "application/dns-message", 
                        "Access-Control-Allow-Origin": "*", 
                        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0", 
                        "X-Cache-Status": "Hit" 
                    }
                });
            } 
            // B. 命中 SWR 异步刷新宽限期（只针对 200 OK 成功响应实施 SWR）
            else if (memRecord.status === 200 && CONFIG.ENABLE_SWR === 1 && memRecord.swrExpires > now) {
                // SWR 严格防抖拦截：确保多实例/多高并发下，后台仅产生 1 个刷新 Promise
                if (!IN_FLIGHT_DOH.has(targetUrlStr)) {
                    const swrPromise = fetchAndCacheUpstream(targetUrlStr);
                    IN_FLIGHT_DOH.set(targetUrlStr, swrPromise);
                    ctx.waitUntil(swrPromise);
                }
                return new Response(new Uint8Array(memRecord.buffer), {
                    status: 200,
                    headers: { 
                        "Content-Type": "application/dns-message", 
                        "Access-Control-Allow-Origin": "*", 
                        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0", 
                        "X-Cache-Status": "SWR-Hit" 
                    }
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

    if (result.buffer) {
        return new Response(new Uint8Array(result.buffer), {
            status: result.status,
            headers: { 
                "Content-Type": "application/dns-message", 
                "Access-Control-Allow-Origin": "*", 
                "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0", 
                "X-Cache-Status": "Miss" 
            }
        });
    }
    
    return new Response(`[DOH Gateway Error]\nStatus: ${result.status}\nMsg: ${result.errorText || 'None'}`, { status: result.status });
}

// 向上游请求并回写内存缓存的公共封装函数
async function fetchAndCacheUpstream(targetUrlStr) {
    try {
        const fetchOpts = buildFetchOptions('GET', CONFIG.ENABLE_COMPRESSION === 1);
        const res = await fetch(targetUrlStr, fetchOpts);
        const status = res.status;

        // 处理正常响应与消极响应
        if (status === 200 || status === 404 || status === 429 || status === 500) {
            const buffer = await res.arrayBuffer();
            const now = Date.now();

            // 【异常大响应阻断防护】防范 HTML/错误配置页面撑爆 V8 隔离槽内存
            if (buffer.byteLength > CONFIG.MAX_RESPONSE_SIZE_LIMIT) {
                return { status: status, buffer: buffer, errorText: null };
            }

            if (CONFIG.DEBUG_CACHE_MODE !== 1) {
                // Map O(1) 淘汰机制
                if (MEM_CACHE.size >= CONFIG.MAX_MEM_CACHE) {
                    const oldestKey = MEM_CACHE.keys().next().value;
                    MEM_CACHE.delete(oldestKey);
                }

                // 动态确定各个状态码的缓存生命周期
                let currentTtl = CONFIG.MEM_CACHE_TTL;
                let isNegative = false;

                if (status !== 200) {
                    isNegative = true;
                    // 【消极缓存层 (Negative Cache)】对异常状态码实施短周期锁定，压制雪崩请求
                    if (status === 404) currentTtl = 10;
                    else if (status === 429) currentTtl = 2;
                    else if (status === 500) currentTtl = 1;
                }

                // 【TTL Jitter 缓存防雪崩随机抖动计算】
                let jitter = 0;
                if (!isNegative) {
                    jitter = Math.floor(Math.random() * 8);
                }
                
                const finalExpires = now + ((currentTtl + jitter) * 1000);
                const finalSwrExpires = now + ((currentTtl + CONFIG.SWR_TTL) * 1000);

                // 【内存安全改进】直接在 Map 中存底层的不可变 ArrayBuffer，绝不暴露有状态的对象指针
                MEM_CACHE.set(targetUrlStr, { 
                    status: status,
                    buffer: buffer, 
                    expires: finalExpires,
                    swrExpires: finalSwrExpires
                });
            }

            return { status: status, buffer: buffer, errorText: null };
        }
        
        return { status: status, buffer: null, errorText: `Upstream Status ${status}` };
    } catch (e) {
        return { status: 502, buffer: null, errorText: `Exception: ${e.message}` };
    } finally {
        IN_FLIGHT_DOH.delete(targetUrlStr);
    }
}