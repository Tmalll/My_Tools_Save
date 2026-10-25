// =================================================================
// CONFIG & REGISTRY：核心参数集中配置
// =================================================================

const CONFIG = {
    // 核心安全前缀
    AUTH_PREFIX: '/SP3eHm618kN71DD',       
    // 1-当前页打开+调试模式(不缓存) | 0-新标签页打开+生产强缓存
    DEBUG_MODE: 1,                         
    // 强缓存时间 (30天)
    CACHE_TTL: 2592000,                    
    
    // 【后端控制核心】
    // 后端解码最大允许限制KB (10MB)
    BACKEND_MAX_SIZE_KB: 10240,            
    // 是否允许后端解码无长度(Transfer-Encoding: chunked)的RAW数据 [1:允许 | 0:锁定必须有长度]
    ALLOW_BACKEND_CHUNKED_RAW: 1,          
    // 0:非图片直接拒绝报错 | 1:非图片自动变成前端解码器下载
    ALLOW_FALLBACK_DOWNLOAD: 1,            
    
    // 【前端控制核心】
    // 前端编码大小限制KB (默认15MB)
    FRONTEND_MAX_SIZE_KB: 15360            
};


// 核心业务注册表：严格按照魔数/前缀排序，统一管理媒体流属性
// 以后添加、修改或删除支持的图片格式，只需直接在此处增减条目即可，下方核心引擎会自动适配
const MAGIC_REGISTRY = [
    { prefix: "iVBORw", isImage: true,  mime: "image/png",  ext: "png",  fallbackName: "image.png" },
    { prefix: "/9j/",   isImage: true,  mime: "image/jpeg", ext: "jpg",  fallbackName: "image.jpg" },
    { prefix: "R0lGOD", isImage: true,  mime: "image/gif",  ext: "gif",  fallbackName: "image.gif" },
    { prefix: "UklGR",  isImage: true,  mime: "image/webp", ext: "webp", fallbackName: "image.webp" },
    { prefix: "AAAAIG", isImage: true,  mime: "image/avif", ext: "avif", fallbackName: "image.avif" },
    { prefix: "PHN2Zy", isImage: true,  mime: "image/svg+xml", ext: "svg", fallbackName: "image.svg" },
    { prefix: "AAABAA", isImage: true,  mime: "image/x-icon", ext: "ico",  fallbackName: "image.ico" },
    { prefix: "Qk0",    isImage: true,  mime: "image/bmp",  ext: "bmp",  fallbackName: "image.bmp" },
    { prefix: "SUkq",   isImage: true,  mime: "image/tiff", ext: "tiff", fallbackName: "image.tiff" },
    { prefix: "TU0A",   isImage: true,  mime: "image/tiff", ext: "tiff", fallbackName: "image.tiff" },
    // 最后一项作为通用二进制兜底项，切勿在其下方添加新规则
    { prefix: null,     isImage: false, mime: "application/octet-stream", ext: "bin", fallbackName: "UnknownBinary.bin" }
];

export default {
    /**
     * 主网关入口函数
     * 负责多环境接入适配、元数据异常拦截、路由权限分发、流扫描判断及最终业务分流
     */
    async fetch(request, env, ctx) {
        // 本地 workerd 部署 Nginx 反代专用协议与域名修复层（CF 线上不配置头部则自动跳过）
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
        const pAdmin = CONFIG.AUTH_PREFIX.replace(/^\/+|\/+$/g, '');
        const cleanPath = url.pathname.toLowerCase();

        
        // 1. 浏览器元数据快速熔断处理，防止无前缀垃圾请求触发 403 路由拦截
        if (cleanPath === '/favicon.ico' || cleanPath === '/apple-touch-icon.png' || 
            cleanPath === '/apple-touch-icon-precomposed.png' || cleanPath === '/site.webmanifest' || 
            cleanPath === '/browserconfig.xml' || cleanPath.includes('android-chrome-')) {
            return new Response(null, { status: 204 });
        }

        // 2. 拦截并分发管理控制面板页面
        if (url.pathname === '/' + pAdmin || url.pathname === '/' + pAdmin + '/') {
            return new Response(getPanelHTML(), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }

        // 3. 安全前缀路由鉴权校验
        if (!url.pathname.startsWith('/' + pAdmin + '/')) {
            return new Response("Forbidden: Access Denied", { status: 403 });
        }

        // 4. 解析直链并还原源站真实目标 URL 路径
        let targetPath = url.pathname.substring(pAdmin.length + 2);
        let hasVirtualImageSuffix = false;
        let matchedExt = "";

        // 根据当前注册表动态扫描提取安全虚拟图片后缀
        for (const item of MAGIC_REGISTRY) {
            if (item.isImage && cleanPath.endsWith('/image.' + item.ext)) {
                hasVirtualImageSuffix = true;
                matchedExt = item.ext;
                break;
            }
        }
        
        // 若携带安全直链后缀，则精准剔除后缀路径，还原出最干净的源站 Raw 链接
        if (hasVirtualImageSuffix) {
            const suffixLength = ('/image.' + matchedExt).length;
            targetPath = targetPath.substring(0, targetPath.length - suffixLength);
        }

        let targetUrl = parseTargetUrl(targetPath + url.search + url.hash);
        if (!targetUrl) return new Response("Invalid Target URL", { status: 400 });

        // 5. 边缘高速缓存拦截读取（仅在非调试模式下生效）
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) return cachedResponse;
        }

        // 6. 对目标源站发起高速拉取（优先透传用户真实浏览器 UA，缺失则进行高版本 Chrome 内核兜底）
        const fetchHeaders = new Headers();
        const userUA = request.headers.get('User-Agent');
        fetchHeaders.set('User-Agent', userUA || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36');

        let upstream = await fetch(targetUrl, { method: 'GET', headers: fetchHeaders, redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: ${upstream.status}`, { status: upstream.status });

        // 无长度依赖判定开关控制中心
        const contentLength = upstream.headers.get("Content-Length");
        if (!contentLength && CONFIG.ALLOW_BACKEND_CHUNKED_RAW !== 1) {
            return new Response("Forbidden: Streaming without Content-Length is rejected by CONFIG.", { status: 403 });
        }

        // 7. 流式复用前置预检（克隆输入流，提取前30字节判定协议头魔数）
        const previewStream = upstream.clone();
        const reader = previewStream.body.getReader();
        const { value } = await reader.read(); 
        
        const chunkText = new TextDecoder().decode(value).trim().substring(0, 30);
        const cleanChunk = chunkText.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');

        // 8. 自动化检索注册表，建立格式哈希映射
        let matchedMeta = MAGIC_REGISTRY.find(item => item.prefix && cleanChunk.startsWith(item.prefix));
        if (!matchedMeta) {
            matchedMeta = MAGIC_REGISTRY[MAGIC_REGISTRY.length - 1]; 
        }

        // 9. 多态场景终极分流执行中心
        if (matchedMeta.isImage) {
            // 图片流处理：补全虚拟后缀，在当前页或新标签页中直接渲染图像
            if (!hasVirtualImageSuffix) {
                const redirectUrl = new URL(request.url);
                redirectUrl.pathname = redirectUrl.pathname.replace(/[\/]+$/, '') + '/image.' + matchedMeta.ext;
                return Response.redirect(redirectUrl.toString(), 302);
            }

            const finalFileName = matchedMeta.fallbackName;
            const fullBase64Text = await upstream.text();
            try {
                const finalBuffer = decodeBase64(fullBase64Text, CONFIG.BACKEND_MAX_SIZE_KB * 1024);
                const respHeaders = new Headers({
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": matchedMeta.mime,
                    "Content-Disposition": `inline; filename="${finalFileName}"`,
                    "Cache-Control": CONFIG.DEBUG_MODE === 1 ? "no-store" : `public, max-age=${CONFIG.CACHE_TTL}`
                });
                if (CONFIG.DEBUG_MODE === 1) respHeaders.set("X-Sniff-Status", "Success-Image-Redirected");

                const response = new Response(finalBuffer, { status: 200, headers: respHeaders });
                if (CONFIG.DEBUG_MODE !== 1) ctx.waitUntil(cache.put(cacheKey, response.clone()));
                return response;
            } catch (e) {
                return new Response(`Decoder Exception: ${e.message}`, { status: 500 });
            }
        } else {
            // 二进制模式处理：清洗提取文件名，下发全自动化流式进度条解码落地下载页面
            const finalFileName = resolveBinaryFileName(targetUrl.pathname, matchedMeta.fallbackName);

            if (CONFIG.ALLOW_FALLBACK_DOWNLOAD !== 1) {
                return new Response("Forbidden: Not a valid image Base64 stream.", { status: 403 });
            }

            const fullText = await upstream.text();
            const fallbackHTML = getFallbackDecoderHTML(fullText, finalFileName);
            return new Response(fallbackHTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
    }
};

// =================================================================
// 🧩 FUNCTIONS：专属工具函数
// =================================================================

/**
 * 目标路径二进制文件名清洗、多层级 URL 解码与后缀纠正分析器
 */
function resolveBinaryFileName(pathname, fallbackName) {
    let cleanPath = pathname;
    if (cleanPath.includes('%')) {
        try {
            let prev = "";
            while (cleanPath !== prev && cleanPath.includes('%')) {
                prev = cleanPath;
                cleanPath = decodeURIComponent(cleanPath);
            }
        } catch(e) {}
    }

    const index = cleanPath.lastIndexOf('/');
    let lastSeg = index !== -1 ? cleanPath.substring(index + 1) : cleanPath;
    lastSeg = lastSeg.trim();

    const lowerSeg = lastSeg.toLowerCase();
    if (lowerSeg.endsWith('.b64')) {
        lastSeg = lastSeg.slice(0, -4);
    } else if (lowerSeg.endsWith('.base64')) {
        lastSeg = lastSeg.slice(0, -7);
    }

    if (!lastSeg || !lastSeg.includes('.') || lastSeg.toLowerCase() === 'raw') {
        return fallbackName;
    }

    return lastSeg;
}

/**
 * 宽松型目标 URL 格式化与协议补全解析引擎
 */
function parseTargetUrl(path) {
    if (!/^https?[:\/]+/i.test(path)) return null;
    let full = path.replace(/^https?[:\/]+/i, 'https://');
    if (path.startsWith('http/')) full = path.replace(/^http[:\/]+/i, 'http://');
    try { return new URL(full); } catch { return null; }
}

/**
 * 高性能同步 Base64 字符串转物理 ArrayBuffer 转换器，带物理溢出拦截
 */
function decodeBase64(rawText, maxBytes) {
    let cleaned = rawText.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
    const mod = cleaned.length % 4;
    if (mod > 1) cleaned += "=".repeat(4 - mod);
    if (cleaned.length > maxBytes) throw new Error("Stream size overflow limit.");
    const binary = atob(cleaned);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) { bytes[i] = binary.charCodeAt(i); }
    return bytes.buffer;
}

// =================================================================
// 🖥️ HTML：控制面板（通用文件分块编码引擎 + 物理渲染进度条）
// =================================================================
function getPanelHTML() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CDN 极简中转站</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>
        body{font-family:sans-serif;background:#f4f6f9;color:#333;padding:20px;display:flex;flex-direction:column;align-items:center}
        .box{width:100%;max-width:650px;background:#fff;padding:20px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);margin-top:40px}
        input[type="text"]{width:100%;padding:14px;font-size:14px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;margin-bottom:15px;outline:none}
        input[type="text"]:focus{border-color:#409eff}
        .btn-row{display:flex;gap:12px}
        .btn{flex:1;padding:14px;font-size:14px;color:#fff;background:#409eff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;text-align:center;box-sizing:border-box}
        .btn:hover{background:#66b1ff}.btn-green{background:#67c23a}.btn-green:hover{background:#85ce61}
        .progress-wrapper{width:100%;background:#ebeef5;border-radius:10px;margin-top:15px;display:none;overflow:hidden;position:relative;height:18px}
        .progress-bar{height:100%;width:0%;background:#67c23a;transition:width 0.1s ease}
        .progress-text{position:absolute;width:100%;text-align:center;font-size:11px;font-weight:bold;color:#333;line-height:18px}
    </style></head><body>
    <div class="box">
        <h3 style="margin:0 0 15px 0;text-align:center;color:#222">CDN 极简中转控制面板</h3>
        <input type="text" id="urlInput" placeholder="直接粘贴各种完整的 RAW URL (支持 Gist Raw, Pastebin Raw 等)...">
        <div class="btn-row">
            <button class="btn" id="btnGo">生成并跳转反代直链</button>
            <button class="btn btn-green" id="btnPick">编码文件为Base64</button>
        </div>
        <div class="progress-wrapper" id="progressWrapper">
            <div class="progress-bar" id="progressBar"></div>
            <div class="progress-text" id="progressText">准备编码... 0%</div>
        </div>
        <input type="file" id="fileFile" style="display:none">
    </div>
    <script>
        const AUTH_PREFIX = "${CONFIG.AUTH_PREFIX}";
        const DEBUG_MODE = ${CONFIG.DEBUG_MODE}; 
        const FRONTEND_MAX_SIZE_KB = ${CONFIG.FRONTEND_MAX_SIZE_KB};
        
        document.getElementById('btnGo').onclick = function(e) {
            if(e) { e.preventDefault(); e.stopPropagation(); }
            const val = document.getElementById('urlInput').value.trim();
            if(!val) { alert("请输入有效的 Raw 源站网络外链！"); return false; }
            
            let cleanUrl = val;
            if(/^https?:\\/\\//i.test(cleanUrl)) {
                cleanUrl = cleanUrl.replace(/^https?:\\/\\//i, function(m){ return m.toLowerCase().replace('://', '/'); });
            } else if(!/^https?\\//i.test(cleanUrl)) {
                cleanUrl = 'https/' + cleanUrl;
            }
            const finalJumpUrl = window.location.origin + AUTH_PREFIX + '/' + cleanUrl;
            
            if (DEBUG_MODE === 1) {
                window.location.href = finalJumpUrl;
                return false;
            } else {
                window.open(finalJumpUrl, '_blank');
                return false;
            }
        };

        document.getElementById('btnPick').onclick = function() { document.getElementById('fileFile').click(); };
        document.getElementById('fileFile').onchange = function() {
            if(this.files.length === 0) return;
            const file = this.files[0];
            if (file.size > FRONTEND_MAX_SIZE_KB * 1024) {
                alert("文件大小超过前端限制 (" + (FRONTEND_MAX_SIZE_KB / 1024).toFixed(1) + "MB)，已被强制拦截。");
                this.value = ""; return;
            }

            const wrapper = document.getElementById('progressWrapper');
            const bar = document.getElementById('progressBar');
            const txt = document.getElementById('progressText');
            
            wrapper.style.display = 'block'; bar.style.width = '0%';
            txt.textContent = "正在初始化流读取器...";

            const chunkSize = 1024 * 256; let offset = 0; let binaryString = "";
            const readChunk = () => {
                const reader = new FileReader();
                const blob = file.slice(offset, offset + chunkSize);
                reader.onload = function(e) {
                    const bytes = new Uint8Array(e.target.result);
                    let chunkStr = "";
                    for (let i = 0; i < bytes.length; i++) { chunkStr += String.fromCharCode(bytes[i]); }
                    binaryString += chunkStr; offset += chunkSize;
                    let percent = Math.min(100, Math.floor((offset / file.size) * 100));
                    bar.style.width = percent + '%'; txt.textContent = "正在编码数据流: " + percent + "%";
                    if (offset < file.size) { setTimeout(readChunk, 1); } else {
                        txt.textContent = "正在执行最终打包与哈希映射...";
                        setTimeout(() => {
                            try {
                                const base64Result = btoa(binaryString);
                                const blobOut = new Blob([base64Result], { type: "text/plain;charset=utf-8" });
                                const dlUrl = URL.createObjectURL(blobOut);
                                const a = document.createElement('a'); a.href = dlUrl; a.download = file.name + ".b64";
                                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(dlUrl);
                                txt.textContent = "编码并导出成功！";
                            } catch(err) {
                                txt.textContent = "发生致命溢出异常。";
                                alert("Base64 转码失败，原文件可能包含无法识别的系统字符。");
                            } finally {
                                document.getElementById('fileFile').value = "";
                                setTimeout(() => { wrapper.style.display = 'none'; }, 3000);
                            }
                        }, 50);
                    }
                };
                reader.readAsArrayBuffer(blob);
            };
            readChunk();
        };
    </script>
</body></html>`;
}

// =================================================================
// 📦 FALLBACK HTML：前端沙盒流式分块还原下载引擎（高精准物理进度条）
// =================================================================
function getFallbackDecoderHTML(rawPayload, cleanFileName) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>正在落地资产...</title><style>
        body{font-family:sans-serif;background:#f4f6f9;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}
        .card{background:#fff;padding:30px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.1);text-align:center;width:100%;max-width:440px;box-sizing:border-box}
        .progress-wrapper{width:100%;background:#ebeef5;border-radius:10px;margin-top:20px;overflow:hidden;position:relative;height:18px}
        .progress-bar{height:100%;width:0%;background:#e6a23c;transition:width 0.1s ease}
        .progress-text{position:absolute;width:100%;left:0;top:0;text-align:center;font-size:11px;font-weight:bold;color:#333;line-height:18px}
    </style></head><body>
    <div class="card">
        <h3 id="statusTitle" style="margin:0 0 10px 0;color:#e6a23c">正在落地通用数据流</h3>
        <p style="font-size:13px;color:#333;font-weight:bold;word-break:break-all;margin-bottom:8px">正在还原：${cleanFileName}</p>
        <p style="font-size:12px;color:#666;line-height:1.5;margin:0">系统正在分块解码并还原物理二进制结构，请勿关闭窗口...</p>
        
        <div class="progress-wrapper">
            <div class="progress-bar" id="progressBar"></div>
            <div class="progress-text" id="progressText">准备解码... 0%</div>
        </div>
    </div>
    <script>
        (function() {
            const DEBUG_MODE = ${CONFIG.DEBUG_MODE};
            const bar = document.getElementById('progressBar');
            const txt = document.getElementById('progressText');
            const title = document.getElementById('statusTitle');
            
            try {
                const rawB64 = \`${rawPayload.replace(/[`\\$]/g, '\\$&')}\`.replace(/[\\r\\n\\s\\t]+/g, '').replace(/^data:[^,]+,/, '');
                const totalLen = rawB64.length;
                
                let binaryStr = "";
                let offset = 0;
                const chunkSize = 1024 * 512; 
                
                const decodeChunk = () => {
                    const segment = rawB64.substring(offset, offset + chunkSize);
                    binaryStr += atob(segment);
                    offset += chunkSize;
                    
                    let percent = Math.min(100, Math.floor((offset / totalLen) * 100));
                    bar.style.width = percent + '%';
                    txt.textContent = "正在本地解码中: " + percent + "%";
                    
                    if (offset < totalLen) {
                        setTimeout(decodeChunk, 1);
                    } else {
                        txt.textContent = "正在装配原始文件指针...";
                        setTimeout(() => {
                            const len = binaryStr.length;
                            const bytes = new Uint8Array(len);
                            for (let i = 0; i < len; i++) { bytes[i] = binaryStr.charCodeAt(i); }
                            
                            const blob = new Blob([bytes.buffer], { type: "application/octet-stream" });
                            const dlUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = dlUrl; a.download = "${cleanFileName}"; 
                            document.body.appendChild(a); a.click();
                            
                            setTimeout(() => { 
                                document.body.removeChild(a); URL.revokeObjectURL(dlUrl); 
                                if (DEBUG_MODE !== 1) {
                                    window.close(); 
                                } else {
                                    bar.style.backgroundColor = '#67c23a';
                                    title.textContent = '还原下载完成 (调试状态保留页面)';
                                    title.style.color = '#67c23a';
                                    txt.textContent = "100% 落地完成";
                                }
                            }, 800);
                        }, 50);
                    }
                };
                
                decodeChunk();
                
            } catch(e) {
                txt.textContent = "解码故障";
                alert("前端流解码失败，原数据结构可能已损坏或含有截断。");
            }
        })();
    </script>
</body></html>`;
}