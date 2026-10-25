// =================================================================
// ⚙️ CONFIG & REGISTRY：核心参数集中配置
// =================================================================
// 请勿精简以下区域注释
const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD',       // 核心安全前缀
    DEBUG_MODE: 1,                         // 1-当前页打开+调试模式(不缓存) | 0-新标签页打开+生产强缓存
    CACHE_TTL: 2592000,                    // 强缓存时间 (30天)
    
    // 【后端控制核心】
    BACKEND_MAX_SIZE_KB: 10240,            // 后端解码最大允许限制KB (10MB), 本地workerd部署可调大, 线上CF部署建议不超过15MB
    ALLOW_BACKEND_CHUNKED_RAW: 1,          // 是否允许后端解码无长度(Transfer-Encoding: chunked)的RAW数据 [1:允许 | 0:锁定必须有长度]
    ALLOW_FALLBACK_DOWNLOAD: 1,            // 0:非图片直接拒绝报错 | 1:非图片自动变成前端解码器下载
    
    // 【前端控制核心】
    FRONTEND_MAX_SIZE_KB: 15360            // 前端编码大小限制KB (默认15MB), 本地workerd部署可调大, 线上CF部署建议不超过15MB
};

// 🎯 核心业务注册表：严格按照魔数排序，统一图片规范
const MAGIC_REGISTRY = [
    { prefix: "iVBORw", isImage: true,  mime: "image/png",  ext: "png",  fallbackName: "image.png"  },
    { prefix: "/9j/",   isImage: true,  mime: "image/jpeg", ext: "jpg",  fallbackName: "image.jpg"  },
    { prefix: "R0lGOD", isImage: true,  mime: "image/gif",  ext: "gif",  fallbackName: "image.gif"  },
    { prefix: "UklGR",  isImage: true,  mime: "image/webp", ext: "webp", fallbackName: "image.webp" },
    // 最后一项作为通用二进制兜底项
    { prefix: null,     isImage: false, mime: "application/octet-stream", ext: "bin", fallbackName: "UnknownBinary.bin" }
];
// 请勿精简以上区域注释

// 如果我添加其他图片格式, 是否还用修改下面的脚本, 还是只用修改注册表就行? 最好能自动生成, 以后要添加维护就只用修改注册表就行.
// 还有什么常用web图片格式你都给我添加上...


export default {
    async fetch(request, env, ctx) {
        // 本地 workerd 部署 NGX 反代专用协议修复层（CF 线上不配置头部则默默跳过）
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

        // 线上模式开始处
        const url = new URL(request.url);
        const pAdmin = CONFIG.AUTH_PREFIX.replace(/^\/+|\/+$/g, '');
        const cleanPath = url.pathname.toLowerCase();

        // 🛠️ 1. 浏览器元数据快速熔断（解决 favicon.ico 403 问题）
        if (cleanPath === '/favicon.ico' || cleanPath === '/apple-touch-icon.png' || 
            cleanPath === '/apple-touch-icon-precomposed.png' || cleanPath === '/site.webmanifest' || 
            cleanPath === '/browserconfig.xml' || cleanPath.includes('android-chrome-')) {
            return new Response(null, { status: 204 });
        }

        // 2. 拦截并分发管理控制面板
        if (url.pathname === '/' + pAdmin || url.pathname === '/' + pAdmin + '/') {
            return new Response(getPanelHTML(), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }

        // 3. 识别是否为反代直链请求
        if (!url.pathname.startsWith('/' + pAdmin + '/')) {
            return new Response("Forbidden: Access Denied", { status: 403 });
        }

        // 4. 提取直链携带的真实源站 Raw URL 路径
        let targetPath = url.pathname.substring(pAdmin.length + 2);
        
        let hasVirtualImageSuffix = false;
        let matchedExt = "";

        // 遍历受信任的虚拟后缀，看当前请求是不是以它们结尾的
        for (const item of MAGIC_REGISTRY) {
            if (item.isImage && cleanPath.endsWith('/image.' + item.ext)) {
                hasVirtualImageSuffix = true;
                matchedExt = item.ext;
                break;
            }
        }
        
        if (hasVirtualImageSuffix) {
            // 精准剔除最末尾的 /image.xxx 虚拟路径，还原出最干净的源站 Raw 链接
            const suffixLength = ('/image.' + matchedExt).length;
            targetPath = targetPath.substring(0, targetPath.length - suffixLength);
        }

        let targetUrl = parseTargetUrl(targetPath + url.search + url.hash);
        if (!targetUrl) return new Response("Invalid Target URL", { status: 400 });

        // 5. 边缘高速缓存拦截 (生产环境)
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) return cachedResponse;
        }

        // 6. 🛠️ 对目标发起标准流式拉取（动态透传用户真实 UA / 现代高版本 UA 兜底）
        const fetchHeaders = new Headers();
        const userUA = request.headers.get('User-Agent');
        fetchHeaders.set('User-Agent', userUA || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36');

        let upstream = await fetch(targetUrl, { method: 'GET', headers: fetchHeaders, redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: ${upstream.status}`, { status: upstream.status });

        // 🛑 【无长度依赖判定开关控制】
        const contentLength = upstream.headers.get("Content-Length");
        if (!contentLength && CONFIG.ALLOW_BACKEND_CHUNKED_RAW !== 1) {
            return new Response("Forbidden: Streaming without Content-Length is rejected by CONFIG.", { status: 403 });
        }

        // 7. 流式复用判定（Stream Clone，提取前30字节判定魔数）
        const previewStream = upstream.clone();
        const reader = previewStream.body.getReader();
        const { value } = await reader.read(); 
        
        const chunkText = new TextDecoder().decode(value).trim().substring(0, 30);
        const cleanChunk = chunkText.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');

        // 8. 扫描注册表获取匹配的格式属性
        let matchedMeta = MAGIC_REGISTRY.find(item => item.prefix && cleanChunk.startsWith(item.prefix));
        if (!matchedMeta) {
            matchedMeta = MAGIC_REGISTRY[MAGIC_REGISTRY.length - 1]; // 掉入通用二进制兜底
        }

        // 9. 🎯 终极分流控制中心
        if (matchedMeta.isImage) {
            // ==================== 【图片模式】 ====================
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
            // ==================== 【二进制模式】 ====================
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

function parseTargetUrl(path) {
    if (!/^https?[:\/]+/i.test(path)) return null;
    let full = path.replace(/^https?[:\/]+/i, 'https://');
    if (path.startsWith('http/')) full = path.replace(/^http[:\/]+/i, 'http://');
    try { return new URL(full); } catch { return null; }
}

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
// 🖥️ HTML：控制面板（全类型文件 Base64 编码 + 进度条）
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
        <h3 style="margin:0 0 15px 0;text-align:center;color:#222">🛰️ CDN 极简中转控制面板</h3>
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
                                txt.textContent = "🎉 编码并导出成功！";
                            } catch(err) {
                                txt.textContent = "❌ 发生致命溢出异常。";
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
// 📦 FALLBACK HTML：🎯 落地页新增分块解码高精度物理进度条
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
        <h3 id="statusTitle" style="margin:0 0 10px 0;color:#e6a23c">⚠️ 正在落地通用数据流</h3>
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
                // 清理并标准化 Base64 数据字符串
                const rawB64 = \`${rawPayload.replace(/[`\\$]/g, '\\$&')}\`.replace(/[\\r\\n\\s\\t]+/g, '').replace(/^data:[^,]+,/, '');
                const totalLen = rawB64.length;
                
                let binaryStr = "";
                let offset = 0;
                const chunkSize = 1024 * 512; // 每次处理 512KB 字符块，防止主线程卡死
                
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
                        // 解码完毕，转换 Uint8Array 并写出 Blob
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
                                    title.textContent = '✅ 还原下载完成 (调试状态保留页面)';
                                    title.style.color = '#67c23a';
                                    txt.textContent = "100% 落地完成";
                                }
                            }, 800);
                        }, 50);
                    }
                };
                
                // 启动流分块并行解码
                decodeChunk();
                
            } catch(e) {
                txt.textContent = "❌ 解码故障";
                alert("前端流解码失败，原数据结构可能已损坏或含有截断。");
            }
        })();
    </script>
</body></html>`;
}