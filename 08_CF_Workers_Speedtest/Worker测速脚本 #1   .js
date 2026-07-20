// constants 保持不变
const DEFAULT_TARGET_URL = "http://speedtest.tyo11.jp.leaseweb.net/10000mb.bin";

// Worker 核心逻辑：仅作为简单反代
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const targetUrl = url.searchParams.get('target');

        if (!targetUrl) {
            return handleConfigPage(url.href);
        }

        try {
            const requestHeaders = new Headers(request.headers);
            
            const response = await fetch(targetUrl, { 
                method: request.method, 
                headers: requestHeaders,
                cf: { stream: true } 
            });

            if (!response.ok || !response.body) {
                return new Response(`Failed to fetch target URL: ${response.statusText}`, { status: response.status });
            }

            const headers = new Headers(response.headers);
            headers.delete('Content-Encoding'); 
            headers.delete('Transfer-Encoding');
            
            if (response.status === 200 && !requestHeaders.get('range')) {
                 headers.delete('Content-Length');
            }

            headers.set('Cache-Control', 'no-store');
            
            return new Response(response.body, {
                status: response.status,
                headers: headers
            });

        } catch (error) {
            console.error('Proxy Error:', error.message);
            return new Response(`Proxy failed: ${error.message}`, { status: 500 });
        }
    }
};

// =========================================================================
// HTML 配置页面及客户端 JS 逻辑 (移除中止/限时功能，优化限速平滑度)
// =========================================================================

function getHtmlContent(urlList, workerBaseUrl) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cloudflare 下载性能测速 (可限速)</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px; }
                h1 { text-align: center; color: #333; }
                .form-group { margin-bottom: 20px; }
                label { display: block; margin-bottom: 5px; font-weight: bold; }
                .input-group { display: flex; gap: 10px; }
                input[type="number"], input[type="url"], select { 
                    flex-grow: 1; 
                    padding: 10px; 
                    border: 1px solid #ddd; 
                    border-radius: 4px; 
                    box-sizing: border-box;
                }
                #targetUrl { width: 100%; }
                
                .button-group { display: flex; gap: 10px; margin-top: 20px; }
                .button-group button { flex-grow: 1; padding: 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; color: white; }
                #startTestButton { background-color: #dc3545; }
                #startTestButton:hover { background-color: #c82333; }
                #copyLinkButton { background-color: #28a745; }
                #copyLinkButton:hover { background-color: #1e7e34; }
                
                .note { font-size: 0.9em; color: #666; margin-top: 5px; }
                .reference-list { margin-top: 10px; padding-left: 20px; }
                #resultDiv { margin-top: 20px; padding: 10px; border: 1px solid #eee; background-color: #f9f9f9; min-height: 50px; }
                .speed-value { font-size: 2em; font-weight: bold; color: #007bff; }
                .speed-unit { font-size: 0.5em; font-weight: normal; color: #666; }
            </style>
        </head>
        <body>
            <h1>Cloudflare 下载性能测速 (可限速)</h1>
            <p class="note">Workers 后端仅做无限速反代。限速功能在浏览器前端实现。</p>
            
            <form id="testForm">
                
                <div class="form-group">
                    <label for="limitMbps">客户端限速 (Mbps, 0为无限速):</label>
                    <input type="number" id="limitMbps" value="0" min="0" required>
                    <div class="note">限速在浏览器端通过流控制实现，但可能存在**卡顿**现象（尤其在低速限速时）。</div>
                </div>
                
                <div class="form-group">
                    <label for="targetUrl">反代目标网址 (Target URL):</label>
                    <input type="url" id="targetUrl" value="${DEFAULT_TARGET_URL}" required>
                    <div class="note">请确保目标文件足够大。</div>
                    <ul class="reference-list">
                        <p>参考测试文件:</p>
                        ${urlList}
                    </ul>
                </div>

                <div class="button-group">
                    <button type="submit" id="startTestButton">开始测速 (下载直到完成)</button>
                    <button type="button" id="copyLinkButton">复制直连 (无限速)</button>
                </div>
            </form>
            
            <div id="resultDiv">
                <div id="realtimeSpeed" class="speed-value">-- <span class="speed-unit">MB/s</span></div>
            </div>
            
            <script>
                document.addEventListener('DOMContentLoaded', () => {
                    const KB_PER_MB = 1024;
                    const workerBaseUrl = window.location.origin + window.location.pathname;
                    
                    // --- 状态变量 ---
                    let testStartTime = 0;
                    let lastUpdateTime = 0;
                    let lastBytes = 0;
                    let totalBytesDownloaded = 0;
                    let isTestRunning = false;
                    let intervalTimer = null; 
                    let currentAbortController = null; // 用于取消请求，但前端不提供“中止”按钮
                    
                    const UPDATE_INTERVAL_MS = 100;

                    // --- 辅助函数 ---
                    function formatSpeed(bytesPerSecond) {
                        if (bytesPerSecond >= 1024 * 1024) {
                            return (bytesPerSecond / 1024 / 1024).toFixed(2) + ' <span class="speed-unit">MB/s</span>';
                        }
                        return (bytesPerSecond / 1024).toFixed(2) + ' <span class="speed-unit">KB/s</span>';
                    }
                    
                    // --- 状态更新 (仅清理 UI/Timer，无中止逻辑) ---
                    function updateStatus(bytesSent, terminationReason = null) {
                        const resultDiv = document.getElementById('resultDiv');
                        const realtimeSpeedDiv = document.getElementById('realtimeSpeed');
                        const startButton = document.getElementById('startTestButton');
                        
                        if (!resultDiv || !realtimeSpeedDiv) return; 

                        const currentTime = Date.now();
                        const timeElapsed = (currentTime - testStartTime) / 1000;
                        
                        // 瞬时速度计算
                        const timeDiff = (currentTime - lastUpdateTime) / 1000;
                        const bytesDiff = bytesSent - lastBytes;
                        const instantSpeedBPS = (timeDiff > 0) ? (bytesDiff / timeDiff) : 0;
                        
                        const averageSpeedBPS = (timeElapsed > 0) ? (bytesSent / timeElapsed) : 0;

                        realtimeSpeedDiv.innerHTML = formatSpeed(instantSpeedBPS);

                        resultDiv.innerHTML = \`
                            <div><strong>瞬时速度:</strong> <span class="speed-value">\${formatSpeed(instantSpeedBPS)}</span></div>
                            <div><strong>平均速度:</strong> \${formatSpeed(averageSpeedBPS)}</div>
                            <div>已下载: \${(bytesSent / 1024 / 1024).toFixed(2)} MB</div>
                            <div>已运行: \${timeElapsed.toFixed(1)} 秒</div>
                        \`;
                        
                        // 更新状态变量 (非终止状态)
                        if (!terminationReason) {
                            lastUpdateTime = currentTime;
                            lastBytes = bytesSent;
                        }

                        if (terminationReason) {
                            // 终止计时器和运行状态
                            if (intervalTimer) clearInterval(intervalTimer);
                            isTestRunning = false;
                            currentAbortController = null; 
                            
                            // 显示最终结果
                            realtimeSpeedDiv.innerHTML = formatSpeed(averageSpeedBPS);
                            resultDiv.innerHTML += \`<div style="font-size: 1.2em; margin-top: 10px;"><strong>最终平均速度:</strong> <span style="color: #007bff;">\${formatSpeed(averageSpeedBPS)}</span></div>\`;

                            // 显示终止原因
                            let terminationMessage = '';
                            if (terminationReason === 'COMPLETE') {
                                terminationMessage = \`<div style="color: green; font-weight: bold;">✅ 测速完成：文件下载完毕。</div>\`;
                            } else if (terminationReason === 'ERROR') {
                                terminationMessage = \`<div style="color: red;">❌ 测速错误: 网络中断或服务器错误。</div>\`;
                            }
                            resultDiv.innerHTML += terminationMessage;
                            
                            // 重新启用按钮
                            startButton.textContent = "重新开始测速";
                            startButton.disabled = false;
                        }
                    }
                    
                    // --- 限速 TransformStream (优化：增大块大小，减少 JS 延迟次数) ---
                    function createRateLimiter(limitMbps) {
                        const limitBps = limitMbps * 1024 * 1024 / 8; // Mb/s 转换为 Bytes/s
                        // 优化点：增大块大小，减少 JS 调度次数，提高平滑度
                        const LIMIT_CHUNK_SIZE = 256 * KB_PER_MB; // 每次处理 256 KB 的数据 
                        
                        // 如果限速为 0 或低于 300 KB/s，则不限速
                        if (limitBps < 300 * KB_PER_MB) { 
                            return new TransformStream(); 
                        }

                        const TARGET_DELAY_MS = (LIMIT_CHUNK_SIZE / limitBps) * 1000;
                        
                        let lastChunkTime = Date.now();

                        return new TransformStream({
                            async transform(chunk, controller) {
                                let offset = 0;
                                while (offset < chunk.length) {
                                    
                                    const bytesToProcess = Math.min(LIMIT_CHUNK_SIZE, chunk.length - offset);
                                    
                                    // 动态计算实际需要等待的时间
                                    const expectedNextTime = lastChunkTime + TARGET_DELAY_MS;
                                    let delayMs = Math.max(0, expectedNextTime - Date.now());
                                    
                                    // 延迟 (使用 0 延迟优化高负载时的卡顿)
                                    if (delayMs > 0) {
                                       await new Promise(resolve => setTimeout(resolve, delayMs));
                                    }
                                    
                                    // 更新时间和数据
                                    lastChunkTime = Date.now();
                                    controller.enqueue(chunk.slice(offset, offset + bytesToProcess));
                                    offset += bytesToProcess;
                                }
                            }
                        });
                    }

                    // --- 核心测速逻辑 (Fetch API 流式处理 + 限速) ---
                    async function performSpeedTest(targetUrl, limitMbps) {
                        // 如果正在运行，则不允许启动新测试
                        if (isTestRunning) return; 

                        // 初始设置
                        isTestRunning = true;
                        document.getElementById('startTestButton').disabled = true;
                        
                        // 重置全局变量
                        testStartTime = Date.now();
                        lastUpdateTime = testStartTime;
                        lastBytes = 0;
                        totalBytesDownloaded = 0;
                        currentAbortController = new AbortController();
                        
                        const proxyUrl = \`\${workerBaseUrl}?target=\${encodeURIComponent(targetUrl)}\`;
                        document.getElementById('resultDiv').innerHTML = \`<div>🚀 开始测速 (目标: \${targetUrl.substring(0, 40)}...)...</div>\`;
                        
                        // 1. 启动 UI 刷新 Timer
                        intervalTimer = setInterval(() => {
                            updateStatus(totalBytesDownloaded);
                        }, UPDATE_INTERVAL_MS);
                        
                        try {
                            // 2. 发起 fetch 请求
                            const response = await fetch(proxyUrl, {
                                method: 'GET',
                                signal: currentAbortController.signal 
                            });

                            if (!response.ok || !response.body) {
                                throw new Error('Network response not ok.');
                            }

                            // 3. 插入限速流并获取 Reader
                            const rateLimiter = createRateLimiter(limitMbps);
                            const limitedStream = response.body.pipeThrough(rateLimiter);
                            const reader = limitedStream.getReader();

                            while (true) {
                                
                                const { done, value } = await reader.read();

                                if (done) {
                                    updateStatus(totalBytesDownloaded, 'COMPLETE');
                                    break;
                                }

                                // 累加下载字节数
                                totalBytesDownloaded += value.length;
                            }

                        } catch (error) {
                            // 由于移除了中止按钮，此处只处理真正的网络错误
                            if (error.name !== 'AbortError') {
                                updateStatus(totalBytesDownloaded, 'ERROR');
                            }
                        }
                    }

                    // --- 事件监听器 ---
                    document.getElementById('testForm').addEventListener('submit', function(e) {
                        e.preventDefault();
                        
                        if (isTestRunning) return; // 避免重复启动

                        // 准备开始
                        if (intervalTimer) clearInterval(intervalTimer);
                        
                        const limitMbps = parseFloat(document.getElementById('limitMbps').value.trim()) || 0;
                        const targetUrl = document.getElementById('targetUrl').value.trim();
                        
                        performSpeedTest(targetUrl, limitMbps);
                    });
                    
                    // --- Copy Link Listener (保持不变) ---
                    document.getElementById('copyLinkButton').addEventListener('click', function() {
                        const targetUrl = document.getElementById('targetUrl').value.trim();
                        const directLink = \`\${workerBaseUrl}?target=\${encodeURIComponent(targetUrl)}\`;
                        
                        navigator.clipboard.writeText(directLink).then(() => {
                            const button = document.getElementById('copyLinkButton');
                            const originalText = button.textContent;
                            button.textContent = "✅ 已复制链接 (无限速)";
                            setTimeout(() => {
                                button.textContent = originalText;
                            }, 2000);
                        }).catch(err => {
                            alert('复制失败，请手动复制: ' + directLink);
                        });
                    });
                });
            </script>
        </body>
        </html>
    `;
    return html;
}


function handleConfigPage(workerBaseUrl) {
    const REFERENCE_URLS = [
        "http://speedtest.hkg12.hk.leaseweb.net/10000mb.bin",
        "http://speedtest.tyo11.jp.leaseweb.net/10000mb.bin",
        "http://speedtest.sin1.sg.leaseweb.net/10000mb.bin",
        "http://speedtest.lax11.us.leaseweb.net/10000mb.bin",
        "http://speedtest.dal13.us.leaseweb.net/10000mb.bin",
        "http://speedtest.nyc1.us.leaseweb.net/10000mb.bin",
        "http://speedtest.fra1.de.leaseweb.net/10000mb.bin"
    ];
    const urlList = REFERENCE_URLS.map(url => `<li><code>${url}</code></li>`).join('');

    const htmlContent = getHtmlContent(urlList, workerBaseUrl);

    return new Response(htmlContent, {
        headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Cache-Control': 'no-store'
        }
    });
}