// =================================================================
// ⚙️ CONFIG & REGISTRY：核心参数集中配置（新增前端限制与强控开关）
// =================================================================
const CONFIG = {
    AUTH_PREFIX: '/SP3eHm618kN71DD',       // 核心安全前缀
    DEBUG_MODE: 1,                         // 1-当前页打开+调试模式(不缓存) | 0-新标签页打开+生产强缓存
    CACHE_TTL: 2592000,                    // 强缓存时间 (30天)
    
    // 【后端控制核心】
    BACKEND_MAX_SIZE_KB: 10240,            // 后端解码最大允许限制KB (10MB)
    ALLOW_BACKEND_CHUNKED_RAW: 1,          // 是否允许后端解码无长度(Transfer-Encoding: chunked)的RAW数据 [1:允许 | 0:锁定必须有长度]
    ALLOW_FALLBACK_DOWNLOAD: 1,            // 0:非图片直接拒绝报错 | 1:非图片自动变成前端解码器下载
    
    // 【前端控制核心】
    FRONTEND_MAX_SIZE_KB: 15360            // 前端编码大小限制KB (默认15MB)
};

// 🎯 核心业务注册表：严格按照魔数排序，统一图片规范
const MAGIC_REGISTRY = [
    { prefix: "iVBORw", isImage: true,  mime: "image/png",  ext: "png",  fallbackName: "image.png" },
    { prefix: "/9j/",   isImage: true,  mime: "image/jpeg", ext: "jpg",  fallbackName: "image.jpg" },
    { prefix: "R0lGOD", isImage: true,  mime: "image/gif",  ext: "gif",  fallbackName: "image.gif" },
    { prefix: "UklGR",  isImage: true,  mime: "image/webp", ext: "webp", fallbackName: "image.webp" },
    // 最后一项作为通用二进制兜底项
    { prefix: null,     isImage: false, mime: "application/octet-stream", ext: "bin", fallbackName: "UnknownBinary.bin" }
];

export default {
    async fetch(request, env, ctx) {
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

        // 6. 对目标发起标准流式拉取
        const fetchHeaders = new Headers({ "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" });
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
// 🖥️ HTML：控制面板（⚡ 全类型文件 Base64 编码 + 物理大文件分块进度条）
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
        
        /* 进度条外壳容器 */
        .progress-wrapper{width:100%;background:#ebeef5;border-radius:10px;margin-top:15px;display:none;overflow:hidden;position:relative;height:18px}
        .progress-bar{height:100%;width:0%;background:#67c23a;transition:width 0.1s ease;display:flex;align-items:center;justify-content:center}
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

        // 🎯 激活通用文件选择器，不再限定格式
        document.getElementById('btnPick').onclick = function() { document.getElementById('fileFile').click(); };
        
        document.getElementById('fileFile').onchange = function() {
            if(this.files.length === 0) return;
            const file = this.files[0];
            
            // 🎯 检查前端大小限制拦截
            if (file.size > FRONTEND_MAX_SIZE_KB * 1024) {
                alert("文件大小超过前端限制 (" + (FRONTEND_MAX_SIZE_KB / 1024).toFixed(1) + "MB)，已被强制拦截。");
                this.value = "";
                return;
            }

            const wrapper = document.getElementById('progressWrapper');
            const bar = document.getElementById('progressBar');
            const txt = document.getElementById('progressText');
            
            wrapper.style.display = 'block';
            bar.style.width = '0%';
            txt.textContent = "正在初始化流读取器...";

            // 🎯 使用高阶分块数据流（FileReader + Chunked）精准喂入，实现顺滑进度条
            const chunkSize = 1024 * 256; // 每块 256KB
            let offset = 0;
            let binaryString = "";
            
            const readChunk = () => {
                const reader = new FileReader();
                const blob = file.slice(offset, offset + chunkSize);
                
                reader.onload = function(e) {
                    const bytes = new Uint8Array(e.target.result);
                    let chunkStr = "";
                    for (let i = 0; i < bytes.length; i++) {
                        chunkStr += String.fromCharCode(bytes[i]);
                    }
                    binaryString += chunkStr;
                    offset += chunkSize;

                    // 计算当前物理进度
                    let percent = Math.min(100, Math.floor((offset / file.size) * 100));
                    bar.style.width = percent + '%';
                    txt.textContent = "正在编码数据流: " + percent + "%";

                    if (offset < file.size) {
                        setTimeout(readChunk, 1); // 释放主线程空闲，避免 UI 假死卡顿
                    } else {
                        // 最后一包读取完成，开始最终的 Base64 拼装导出
                        txt.textContent = "正在执行最终打包与哈希映射...";
                        setTimeout(() => {
                            try {
                                const base64Result = btoa(binaryString);
                                const blobOut = new Blob([base64Result], { type: "text/plain;charset=utf-8" });
                                const dlUrl = URL.createObjectURL(blobOut);
                                
                                const a = document.createElement('a'); 
                                a.href = dlUrl; 
                                // 🎯 输出格式强制修正为：原文件名 + 扩展名 + .b64
                                a.download = file.name + ".b64";
                                
                                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(dlUrl);
                                txt.textContent = "🎉 编码并导出成功！";
                            } catch(err) {
                                txt.textContent = "❌ 发生致命溢出异常。";
                                alert("Base64 转码发生内部错误，可能包含无法识别的系统字符。");
                            } finally {
                                document.getElementById('fileFile').value = "";
                                setTimeout(() => { wrapper.style.display = 'none'; }, 3000);
                            }
                        }, 50);
                    }
                };
                reader.readAsArrayBuffer(blob);
            };

            // 启动分块读取流
            readChunk();
        };
    </script>
</body></html>`;
}

// =================================================================
// 📦 FALLBACK HTML：前端沙盒解码落地下载引擎（调试时自动保留标签页）
// =================================================================
function getFallbackDecoderHTML(rawPayload, cleanFileName) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>正在落地资产...</title><style>
        body{font-family:sans-serif;background:#f4f6f9;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}
        .card{background:#fff;padding:30px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.1);text-align:center;max-width:440px}
        .loader{border:4px solid #f3f3f3;border-top:4px solid #e6a23c;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto 15px}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
    </style></head><body>
    <div class="card">
        <div class="loader"></div>
        <h3 style="margin:0 0 10px 0;color:#e6a23c">⚠️ 检测到通用数据流</h3>
        <p style="font-size:13px;color:#333;font-weight:bold;word-break:break-all;margin-bottom:8px">正在还原：${cleanFileName}</p>
        <p style="font-size:12px;color:#666;line-height:1.5;margin:0">系统正在本地环境中还原二进制原始结构，完成后将自动拉起下载...</p>
    </div>
    <script>
        (function() {
            const DEBUG_MODE = ${CONFIG.DEBUG_MODE};
            try {
                const b64Data = \`${rawPayload.replace(/[`\\$]/g, '\\$&')}\`.replace(/[\\r\\n\\s\\t]+/g, '').replace(/^data:[^,]+,/, '');
                const binaryStr = atob(b64Data);
                const len = binaryStr.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) { bytes[i] = binaryStr.charCodeAt(i); }
                
                const blob = new Blob([bytes.buffer], { type: "application/octet-stream" });
                const dlUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = dlUrl;
                a.download = "${cleanFileName}"; 
                document.body.appendChild(a); a.click();
                
                setTimeout(() => { 
                    document.body.removeChild(a); 
                    URL.revokeObjectURL(dlUrl); 
                    if (DEBUG_MODE !== 1) {
                        window.close(); 
                    } else {
                        document.querySelector('.loader').style.display = 'none';
                        document.querySelector('h3').textContent = '✅ 还原下载完成 (调试状态保留页面)';
                        document.querySelector('h3').style.color = '#67c23a';
                    }
                }, 800);
            } catch(e) {
                alert("前端流解码失败，原数据结构可能已损坏。");
            }
        })();
    </script>
</body></html>`;
}