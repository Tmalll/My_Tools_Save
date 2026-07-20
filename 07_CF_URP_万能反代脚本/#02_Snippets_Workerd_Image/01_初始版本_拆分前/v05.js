const CONFIG = {
    // ==================== 🔒 安全与路径路由配置 ====================
    AUTH_PREFIX: '/SP3eHm618kN71DD',       // 🛠️ 全局唯一安全前缀（管理面板与直链共用）
    DEBUG_MODE: 1,                         // 🛠️ 1-开启调试（禁用缓存，返回日志头）| 0-生产模式（启用边缘强缓存）
    CACHE_TTL: 2592000,                    // 边缘缓存强缓存周期 (30天)

    // ==================== ⚡ 熔断预限流标尺 ====================
    IMAGE_ENCODE_LIMIT_KB: 5120,           // 🏷️ 前端图片文件编码限制大小 (5MB)
    // 后端最大 Base64 文本限制自动乘以 1.35 膨胀率
    MAX_ALLOWED_BASE64_SIZE_KB: Math.floor(5120 * 1.35), 
    ALLOW_UNKNOWN_LENGTH: 1,               // 1: 缺少 Content-Length 头时允许试读 | 0: 熔断

    // ==================== 🛠️ 路由控制策略注册表 ====================
    // mode 约束: 0=允许所有文件自适应映射 | 1=严格限制只允许图片流
    ROUTE_REGISTRY: {
        'normal':       { label: '普通自适应模式',  set_path: '',        is_b64: 0, set_mime: 'AUTO_MAP',   mode: 0 },
        'jpg64':        { label: '强制JPG解码档',   set_path: 'jpg64',   is_b64: 1, set_mime: 'image/jpeg',  mode: 1 },
        'png64':        { label: '强制PNG解码档',   set_path: 'png64',   is_b64: 1, set_mime: 'image/png',   mode: 1 },
        'gif64':        { label: '强制GIF解码档',   set_path: 'gif64',   is_b64: 1, set_mime: 'image/gif',   mode: 1 },
        'webp64':       { label: '强制WEBP解码档',  set_path: 'webp64',  is_b64: 1, set_mime: 'image/webp',  mode: 1 }
    }
};

// 后端静态后缀与标准 MIME 映射表
const MIME_MAP = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 
    'gif': 'image/gif', 'webp': 'image/webp', 'bmp': 'image/bmp', 
    'ico': 'image/x-icon', 'svg': 'image/svg+xml'
};

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const cleanPath = url.pathname.toLowerCase();
        const debugHeaders = new Headers();
        
        // 过滤空请求与浏览器图标请求
        if (cleanPath === '/favicon.ico' || cleanPath === '/apple-touch-icon.png') {
            return new Response(null, { status: 204 });
        }
        // 跨域 OPTIONS 预检请求放行
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" }
            });
        }

        const pAdmin = CONFIG.AUTH_PREFIX.replace(/^\/+|\/+$/g, '');
        let path = url.pathname;

        // 1. 独立路由分流关卡判定
        if (path === '/' + pAdmin || path === '/' + pAdmin + '/') {
            // 精准命中前缀目录 -> 吐出居中极简控制面板
            return new Response(getPanelHTML(url.origin), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        } else if (path.startsWith('/' + pAdmin + '/')) {
            // 剥离安全前缀，还原内部真实的路由子路径
            path = path.substring(pAdmin.length + 1);
        } else {
            // 未携带正确安全前缀，一律不响应，假死 403 拦截 MJJ
            return new Response("Forbidden: Access Denied", { status: 403 });
        }

        // 2. 剥离并截取尾部用于欺骗论坛及保障另存为体验的“真实原文件名尾巴”
        const fakeTailMatch = path.match(/\/([^\/]+\.[a-zA-Z0-9]+)$/i);
        let discoveredFileName = "file.jpg"; 
        if (fakeTailMatch) {
            discoveredFileName = fakeTailMatch[1];
            path = path.replace(/\/([^\/]+\.[a-zA-Z0-9]+)$/i, ''); // 斩断伪装尾巴，还原真实上网链
        }

        // 3. 动态嗅探解析内部子路由动作属性（如识别出 /jpg64/ 路径）
        let modeKey = 'normal';
        const pathSegments = path.split('/').filter(p => p !== '');
        const firstPart = pathSegments[0];

        if (firstPart && CONFIG.ROUTE_REGISTRY[firstPart]) {
            modeKey = firstPart;
            path = '/' + pathSegments.slice(1).join('/');
        } else {
            path = '/' + pathSegments.join('/');
        }

        const currentMode = CONFIG.ROUTE_REGISTRY[modeKey];

        // 拦截缺失目标的非法空请求
        if (path === '/' || path === '') {
            return new Response("Forbidden: Target Stream Missing", { status: 400 });
        }

        // 4. 解析重构上游真实的远程目标网址 URL
        let targetPath = path.slice(1) + url.search + url.hash;
        let target = parseTargetUrl(targetPath);
        if (!target) return new Response("Invalid Proxy Target Format", { status: 400 });

        // 5. 提取文件后缀名，执行前置双扩展名合规审计
        const originalPathname = target.pathname.toLowerCase();
        const isUrlB64Ext = originalPathname.endsWith('.b64');
        const simFilename = isUrlB64Ext ? originalPathname.slice(0, -4) : originalPathname;
        const extMatch = simFilename.match(/\.([a-zA-Z0-9]+)$/);
        const extension = extMatch ? extMatch[1] : "";

        // 普通自适应模式安全拦截：如果结尾是 .b64 但前面倒数第二个后缀不是常见图片，拒绝防止偷渡
        if (modeKey === 'normal' && isUrlB64Ext && !MIME_MAP.hasOwnProperty(extension)) {
            return new Response(`Forbidden: Unsupported double extension [.${extension}.b64]`, { status: 400 });
        }

        // 根据路由策略分配最终响应的 Content-Type 标头
        let finalMime = (currentMode.set_mime === 'AUTO_MAP') ? (MIME_MAP[extension] || "application/octet-stream") : currentMode.set_mime;

        // MODE 权限判定：如果策略注册表里标记了 mode: 1，说明是强制图片模式，非图片流拒绝
        if (currentMode.mode === 1) {
            const isImg = Object.values(MIME_MAP).includes(finalMime) || MIME_MAP.hasOwnProperty(extension);
            if (!isImg) return new Response("Forbidden: Strict mode only allows image streams.", { status: 403 });
        }

        // 6. 边缘缓存存取检查拦截
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);
        if (CONFIG.DEBUG_MODE !== 1) {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) return cachedResponse;
        }

        // 7. 发送上游拉取请求并执行前置大小熔断检查
        const fetchHeaders = new Headers();
        fetchHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
        
        let upstream = await fetch(target, { method: 'GET', headers: fetchHeaders, redirect: "follow" });
        if (upstream.status !== 200) return new Response(`Upstream Error: ${upstream.status}`, { status: upstream.status });

        if (!checkContentLength(upstream, CONFIG.MAX_ALLOWED_BASE64_SIZE_KB * 1024, CONFIG.ALLOW_UNKNOWN_LENGTH)) {
            return new Response("Forbidden: Content size out of limit boundaries.", { status: 413 });
        }

        // 8. 核心业务处理：调用独立解耦的解码函数，或者是直通拉取
        let finalBody;
        const needDecode = (currentMode.is_b64 === 1) || (modeKey === 'normal' && isUrlB64Ext);

        if (needDecode) {
            try {
                if (CONFIG.DEBUG_MODE === 1) debugHeaders.set("X-Debug-Stage", "1-FetchSuccess");
                const base64Text = await upstream.text();
                // 调用独立 Base64 高效清洗与管道转换函数
                finalBody = decodeBase64Stream(base64Text, CONFIG.MAX_ALLOWED_BASE64_SIZE_KB * 1024, debugHeaders);
            } catch (e) {
                const errHeaders = new Headers();
                errHeaders.set("Access-Control-Allow-Origin", "*");
                if (CONFIG.DEBUG_MODE === 1) errHeaders.set("X-Debug-Error", e.message);
                return new Response(`[Decoder Error] ${e.message}`, { status: 500, headers: errHeaders });
            }
        } else {
            finalBody = await upstream.arrayBuffer();
        }

        // 9. 装配生成最终的边缘传出响应包
        const respHeaders = new Headers();
        respHeaders.set("Access-Control-Allow-Origin", "*");
        respHeaders.set("Content-Type", finalMime);
        // 关键响应头：使右键另存为、或者多线程触发下载时的文件名与截取的原始大名完美保持一致
        respHeaders.set("Content-Disposition", `inline; filename="${encodeURIComponent(discoveredFileName)}"`);

        if (CONFIG.DEBUG_MODE === 1) {
            respHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate");
            for (let [key, value] of debugHeaders.entries()) { respHeaders.set(key, value); }
        } else {
            respHeaders.set("Cache-Control", `public, max-age=${CONFIG.CACHE_TTL}`);
        }

        const finalResponse = new Response(finalBody, { status: 200, headers: respHeaders });
        if (CONFIG.DEBUG_MODE !== 1) ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));

        return finalResponse;
    }
};

// ==================== 🧩 解耦底层独立业务子模块 ====================

// 目标网址清洗标准化处理器
function parseTargetUrl(targetPath) {
    if (!/^https?[:\/]+/i.test(targetPath)) return null;
    let fullTarget = targetPath.replace(/^https?[:\/]+/i, 'https://');
    if (targetPath.startsWith('http/')) fullTarget = targetPath.replace(/^http[:\/]+/i, 'http://');
    try { return new URL(fullTarget); } catch { return null; }
}

// 响应头大小限流熔断阀门
function checkContentLength(response, maxBytes, allowUnknown) {
    const lenStr = response.headers.get("content-length");
    if (!lenStr) return allowUnknown === 1;
    return parseInt(lenStr, 10) <= maxBytes;
}

// 核心解耦模块：独立的 Base64 流解码与映射转换逻辑
function decodeBase64Stream(rawText, maxBytes, debugHeaders) {
    // 清洗掉换行、空白符、并剔除可能携带的 DataURL 前缀
    let cleaned = rawText.replace(/[\r\n\s\t]+/g, '').replace(/^data:[^,]+,/, '');
    const mod = cleaned.length % 4;
    if (mod === 1) throw new Error("Invalid Base64 structure (mod 1)");
    if (mod > 1) cleaned += "=".repeat(4 - mod); // 自动末尾补齐等号
    if (cleaned.length > maxBytes) throw new Error("Cleaned stream exceeds size limitation.");

    if (debugHeaders) debugHeaders.set("X-Debug-Clean-Len", cleaned.length.toString());

    // 内存定长快速转换映射
    const binaryString = atob(cleaned);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    if (len >= 2 && debugHeaders) {
        debugHeaders.set("X-Debug-Image-Magic", `${bytes[0].toString(16).toUpperCase()}${bytes[1].toString(16).toUpperCase()}`);
        debugHeaders.set("X-Debug-Stage", "3-RenderSuccess");
    }
    return bytes.buffer;
}

// ==================== 🖥️ 极简全居中矩阵式主页控制面板 ====================
function getPanelHTML(origin) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CDN 智能自适应外链面板</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#222;background-image:linear-gradient(135deg,#f5f7fa 0%,#e4e8f0 100%);min-height:95vh;margin:0;padding:20px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start}.container{width:100%;max-width:850px;display:flex;flex-direction:column;gap:20px}.card{background:#fff;border-radius:12px;padding:24px;box-shadow:0 8px 24px rgba(0,0,0,0.05)}form{display:flex;gap:10px}input[type="text"]{flex:1;padding:12px;font-size:14px;border:1px solid #dcdfe6;border-radius:6px;outline:none;transition:all .3s}input[type="text"]:focus{border-color:#409eff;box-shadow:0 0 6px rgba(64,158,255,.2)}.btn{padding:12px 20px;color:#fff;border:none;cursor:pointer;font-size:14px;background:#409eff;border-radius:6px;font-weight:500;transition:background .2s}.btn:hover{background:#66b1ff}.btn-group{display:flex;gap:8px;margin-top:12px}.btn-action{padding:6px 14px;font-size:12px;background:#f0f2f5;color:#606266;border:1px solid #dcdfe6;border-radius:4px;cursor:pointer;transition:all .2s;font-weight:500}.btn-action:hover{background:#ecf5ff;color:#409eff;border-color:#c6e2ff}.block-title{font-size:14px;font-weight:600;color:#303133;margin-bottom:8px}.block-item{background:#f8f9fa;border-left:4px solid #409eff;padding:14px;border-radius:0 6px 6px 0}p.uri-p{margin:4px 0;font-size:13px;word-break:break-all;font-family:monospace;background:#ebedf0;padding:10px;border-radius:4px}p.uri-p a{color:#409eff;text-decoration:none;font-weight:500}p.uri-p a:hover{text-decoration:underline}ul.spec-ul{padding-left:20px;margin:5px 0;font-size:12px;font-family:monospace;color:#2c3e50;line-height:1.7}ul.spec-ul li{margin-bottom:4px}code{background:#fff4f4;padding:2px 4px;color:#c7254e;border-radius:3px;font-size:12px}.file-box{display:flex;align-items:center;gap:15px;margin-top:10px}.file-box input[type="file"]{font-size:13px;color:#606266}</style></head><body>
    <div class="container">
        <div class="card">
            <h3 style="margin-top:0;color:#1f2f3d;text-align:center;">🛰️ CDN 智能自适应外链分发系统</h3>
            <form onsubmit="generateMainUrl(); return false;"><input type="text" id="urlInput" placeholder="请输入源站 Gist Raw 或物理网链请求连接..." required><button type="submit" class="btn">生成直链 (自适应)</button></form>
        </div>

        <div id="matrixContainer" style="display:none;">
            <div class="card">
                <div class="block-item">
                    <div class="block-title">🌐 智能通用自适应直链 (Normal Mode)</div>
                    <p class="uri-p"><a id="url_normal" href="#" target="_blank"></a></p>
                    <div class="btn-group">
                        <button class="btn-action" onclick="copyTargetLink()">📋 复制直链</button>
                        <button class="btn-action" onclick="handleJumpAction(event)">🚀 触发跳转</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="card" style="border-top: 3px solid #67c23a;">
            <h4 style="margin-top:0;color:#303133;display:flex;align-items:center;gap:6px;">🖼️ 纯前端本地图片转码器 <small style="font-weight:normal;color:#909399;font-size:12px;">(大小限制: ${CONFIG.IMAGE_ENCODE_LIMIT_KB} KB，不走服务器)</small></h4>
            <div class="file-box">
                <input type="file" id="localImgFile" accept="image/*">
                <button class="btn" style="background:#67c23a;" onclick="processLocalFile()">开始转码并下载</button>
            </div>
        </div>

        <div class="card">
            <h4 style="margin-top:0;color:#303133;">💡 通道机制与强制修饰符矩阵参考</h4>
            <p style="font-size:13px;color:#606266;line-height:1.6;">
                • <b>自适应主路径：</b> 上方默认生成的链接采用后缀嗅探。如果源文件以 <code>.b64</code> 结尾，系统会在后台拉取时<b>自动触发高解耦解码函数</b>。下载或右键另存为时会还原原本的物理文件名。<br>
                • <b>强行转换说明：</b> 如果在特定极端的第三方环境下需要强行覆盖 MIME，您可以在安全前缀后面<b>手动拼接</b>对应格式。当前节点下可用的强行子路由前缀矩阵如下所示：
            </p>
            <div id="debugTipBlock" style="margin-top:10px;">
                <ul class="spec-ul" id="specMatrixList">
                    <li>请在上方输入源站链接后查看对应强行模式拼接指南...</li>
                </ul>
            </div>
        </div>
    </div>
    <script>
        let currentGeneratedLink = ""; // 记忆变量，锁死当前生成的反代直链

        function generateMainUrl() {
            let u = document.getElementById('urlInput').value.trim(); if(!u) return;
            // 规范化处理 http/https 路径样式
            if(/^https?:\\/\\//i.test(u)){ u = u.replace(/^https?:\\/\\//i, function(m){ return m.toLowerCase().replace('://', '/'); }); } else if(!/^https?\\//i.test(u)){ u = 'https/' + u; }
            
            // 提取出物理文件名，应对另存为逻辑
            let rawFileName = "file.jpg";
            const parts = u.split('/');
            const lastPart = parts[parts.length - 1];
            if(lastPart && lastPart.includes('.')) {
                rawFileName = lastPart.toLowerCase().endsWith('.b64') ? lastPart.slice(0, -4) : lastPart;
            }

            const prefixHost = "${origin}${CONFIG.AUTH_PREFIX}";
            currentGeneratedLink = prefixHost + '/' + u + '/' + rawFileName;

            // 写入可点击的 HTML A 标签
            const aLink = document.getElementById('url_normal');
            aLink.textContent = currentGeneratedLink;
            aLink.href = currentGeneratedLink;
            
            // 🧬 下方动态装配生成强制模式说明列表，减少主页体积
            const matrixUl = document.getElementById('specMatrixList');
            matrixUl.innerHTML = ""; // 擦除老旧提示
            
            const forceModes = [
                { path: 'jpg64', name: '强制 JPEG 格式解码流' },
                { path: 'png64', name: '强制 PNG 格式解码流' },
                { path: 'gif64', name: '强制 GIF 格式解码流' },
                { path: 'webp64', name: '强制 WEBP 格式解码流' }
            ];
            
            forceModes.forEach(m => {
                const fullForcePath = prefixHost + '/' + m.path + '/' + u + '/' + rawFileName;
                const li = document.createElement('li');
                li.innerHTML = m.name + " ➡️ <code>" + fullForcePath + "</code>";
                matrixUl.appendChild(li);
            });

            document.getElementById('matrixContainer').style.display = 'block';
        }

        // 精准修复：确保复制按钮抓取的是生成的反代短链
        function copyTargetLink() {
            if(!currentGeneratedLink) return;
            navigator.clipboard.writeText(currentGeneratedLink).then(() => { 
                alert("🚀 针对自适应模式的反代直链已完美复制到剪贴板！"); 
            }).catch(err => {
                alert("复制失败，请手动右键链接复制。");
            });
        }

        // 完美匹配您的跳转习惯与调试修饰键
        function handleJumpAction(event) {
            if(!currentGeneratedLink) return;
            if (event.shiftKey) { 
                window.location.href = currentGeneratedLink; // 当前标签页原地打开
            } else if (event.ctrlKey || event.metaKey) {
                // 如果是后台标签页，可由前台创建个普通 A 标签模拟，默认新页面
                window.open(currentGeneratedLink, '_blank');
            } else { 
                window.open(currentGeneratedLink, '_blank'); // 默认新标签页
            }
        }

        // 纯前端图片本地自动化转码与拦截落地方案
        function processLocalFile() {
            const fileInput = document.getElementById('localImgFile');
            if(fileInput.files.length === 0) { alert("请先选择一张本地图像文件！"); return; }
            
            const file = fileInput.files[0];
            const sizeInKB = file.size / 1024;
            const limit = ${CONFIG.IMAGE_ENCODE_LIMIT_KB};
            
            if(sizeInKB > limit) {
                alert("❌ 转码终止：当前选择的图像文件体积为 " + sizeInKB.toFixed(1) + " KB，已超过限制最大标尺 " + limit + " KB！");
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                let base64Result = e.target.result;
                // 剔除前缀
                if(base64Result.includes("base64,")) {
                    base64Result = base64Result.split("base64,")[1];
                }
                
                // 构造虚拟 Blob 触发自动下载落地
                const blob = new Blob([base64Result], { type: "text/plain;charset=utf-8" });
                const downloadUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = file.name + ".b64"; // 对齐文件名称追加
                document.body.appendChild(a);
                a.click();
                
                // 内存释放
                document.body.removeChild(a);
                URL.revokeObjectURL(downloadUrl);
                alert("🎉 前端编码成功！已自动为您唤起下载： " + file.name + ".b64");
            };
            reader.readAsDataURL(file);
        }
    </script>
</body></html>`;
}