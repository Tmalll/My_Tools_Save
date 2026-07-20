// constants 保持不变
const DEFAULT_TARGET_URL = "http://speedtest.tyo11.jp.leaseweb.net/10000mb.bin";

// Worker 核心逻辑：反代请求
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const targetUrl = url.searchParams.get('target');

        if (!targetUrl) {
            // 如果没有 target 参数，返回配置页面
            return handleConfigPage(url.href);
        }

        try {
            const requestHeaders = new Headers(request.headers);
            
            // 发起对目标 URL 的请求
            const response = await fetch(targetUrl, { 
                method: request.method, 
                headers: requestHeaders,
                cf: { stream: true }, 
                keepalive: true
            });

            if (!response.ok || !response.body) {
                // 将 500 状态码修正回 502/503 或与上游匹配的错误状态
                return new Response(`Failed to fetch target URL: ${response.statusText}`, { status: response.status });
            }

            // 处理响应头，确保不压缩，且适应多线程 Range 请求
            const headers = new Headers(response.headers);
            headers.delete('Content-Encoding'); 
            headers.delete('Transfer-Encoding');
            
            // 如果是 200 且没有 Range 请求，删除 Content-Length，以支持流式传输
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
            // 确保错误响应状态码在 5xx 范围内
            return new Response(`Proxy failed: ${error.message}`, { status: 502 });
        }
    }
};

// =========================================================================
// HTML 配置页面及客户端 JS 逻辑
// =========================================================================

function getHtmlContent(urlList, workerBaseUrl) {
    // 定义常量
    const KB = 1024;
    const MB = 1024 * KB;
    // 新的阈值：2 MB/s
    const HIGH_SPEED_LIMIT_MBPS = 2; 
    const HIGH_SPEED_LIMIT_BPS = HIGH_SPEED_LIMIT_MBPS * MB;
    // 无限速时的固定块大小 (10MB, 新增)
    const HIGH_SPEED_FIXED_CHUNK_MB = 10; 
    const HIGH_SPEED_FIXED_CHUNK_B = HIGH_SPEED_FIXED_CHUNK_MB * MB; 

    // ** 客户端限速默认值: 5 MB/s **
    const DEFAULT_LIMIT_VALUE = 5;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cloudflare 下载测速</title>
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
            <h1>Cloudflare 下载测速</h1>
            <p class="note">Workers 后端仅做无限速反代。单线程限速和块控制在浏览器前端实现。</p>
            
            <form id="testForm">
                
                <div class="form-group">
                    <label for="limitValue">客户端限速 (速率):</label>
                    <div class="input-group">
                        <input type="number" id="limitValue" value="${DEFAULT_LIMIT_VALUE}" min="0" step="any" required>
                        <select id="limitUnit">
                            <option value="MB" selected>MB/s</option>
                            <option value="KB">KB/s</option>
                        </select>
                    </div>
                    <div class="note">输入 0 为无限速。</div>
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
                    const KB = 1024;
                    const MB = 1024 * KB;
                    const workerBaseUrl = window.location.origin + window.location.pathname;
                    
                    // 常量
                    const HIGH_SPEED_LIMIT_BPS = ${HIGH_SPEED_LIMIT_BPS}; 
                    const HIGH_SPEED_FIXED_CHUNK_B = ${HIGH_SPEED_FIXED_CHUNK_B}; // 10 MB

                    // --- 状态变量 ---
                    let testStartTime = 0;
                    let lastUpdateTime = 0;
                    let lastTotalBytes = 0;
                    let isTestRunning = false;
                    let intervalTimer = null; 
                    const UPDATE_INTERVAL_MS = 100; 
                    
                    // 简化为单线程状态
                    let threadState = { id: 1, totalBytes: 0, testStartTime: 0, abortController: new AbortController(), status: 'PENDING' }; 

                    // --- 辅助函数 ---
                    function formatSpeed(bytesPerSecond) {
                        if (bytesPerSecond >= MB) {
                            return (bytesPerSecond / MB).toFixed(2) + ' <span class="speed-unit">MB/s</span>';
                        }
                        return (bytesPerSecond / KB).toFixed(2) + ' <span class="speed-unit">KB/s</span>';
                    }
                    
                    function formatBytes(bytes) {
                        if (bytes >= MB) {
                            return (bytes / MB).toFixed(2) + ' MB';
                        }
                        return (bytes / KB).toFixed(2) + ' KB';
                    }

                    function updateStatus(currentTotalBytes, terminationReason = null) {
                        const resultDiv = document.getElementById('resultDiv');
                        const realtimeSpeedDiv = document.getElementById('realtimeSpeed');
                        const startButton = document.getElementById('startTestButton');
                        
                        if (!resultDiv || !realtimeSpeedDiv) return; 

                        const currentTime = Date.now();
                        const timeElapsed = (currentTime - testStartTime) / 1000;
                        
                        // 瞬时总速度计算
                        const timeDiff = (currentTime - lastUpdateTime) / 1000;
                        const bytesDiff = currentTotalBytes - lastTotalBytes;
                        const instantSpeedBPS = (timeDiff > 0) ? (bytesDiff / timeDiff) : 0;
                        
                        const averageSpeedBPS = (timeElapsed > 0) ? (currentTotalBytes / timeElapsed) : 0;
                        
                        // 更新主速度显示
                        realtimeSpeedDiv.innerHTML = formatSpeed(instantSpeedBPS);

                        let terminationMessage = '';

                        // 更新状态变量 (非终止状态)
                        if (!terminationReason && threadState.status === 'RUNNING') {
                            lastUpdateTime = currentTime;
                            lastTotalBytes = currentTotalBytes;
                        }

                        if (terminationReason || threadState.status === 'COMPLETE' || threadState.status.includes('ERROR')) {
                            if (intervalTimer) clearInterval(intervalTimer);
                            isTestRunning = false;
                            
                            // 终止时显示平均速度
                            realtimeSpeedDiv.innerHTML = formatSpeed(averageSpeedBPS);
                            
                            if (threadState.status === 'COMPLETE') {
                                terminationMessage = \`<div style="color: green; font-weight: bold;">✅ 测速完成：文件下载完毕。</div>\`;
                            } else if (terminationReason === 'ERROR') {
                                terminationMessage = \`<div style="color: red;">❌ 测速错误: 网络中断或服务器错误。</div>\`;
                            }
                            
                            startButton.textContent = "重新开始测速";
                            startButton.disabled = false;
                        }

                        // 更新结果面板
                        resultDiv.innerHTML = \`
                            <div><strong>当前瞬时速度:</strong> <span class="speed-value">\${formatSpeed(instantSpeedBPS)}</span></div>
                            <div><strong>总平均速度:</strong> \${formatSpeed(averageSpeedBPS)}</div>
                            <div>总下载: \${formatBytes(currentTotalBytes)}</div>
                            <div>已运行: \${timeElapsed.toFixed(1)} 秒</div>
                            <div>状态: \${threadState.status}</div>
                            \${terminationMessage}
                        \`;
                    }
                    
                    /**
                     * 限速 TransformStream
                     */
                    function createRateLimiter(limitBps, actualChunkSizeB) {
                        // 无限速 或 块大小不安全 时，返回直通流
                        if (limitBps < KB || actualChunkSizeB <= 0) { 
                            return new TransformStream(); 
                        }

                        // 每次传输 actualChunkSizeB 字节所需的理论延迟 T (毫秒)
                        const TARGET_DELAY_MS = (actualChunkSizeB / limitBps) * 1000;
                        
                        let lastChunkTime = Date.now();
                        
                        return new TransformStream({
                            async transform(chunk, controller) {
                                let offset = 0;
                                // 限制每次处理的字节量为实际计算出的块大小
                                const LIMIT_CHUNK_SIZE = actualChunkSizeB;
                                
                                while (offset < chunk.length) {
                                    // 确定本次要交付的数据量
                                    const rawBytesToProcess = Math.min(LIMIT_CHUNK_SIZE, chunk.length - offset);
                                    const bytesToProcess = Math.floor(rawBytesToProcess);

                                    if (bytesToProcess === 0) {
                                        offset = chunk.length; 
                                        break;
                                    }
                                    
                                    const expectedNextTime = lastChunkTime + TARGET_DELAY_MS;
                                    let delayMs = Math.max(0, expectedNextTime - Date.now());
                                    
                                    // 延迟 (避免过小的延迟，减少 CPU 开销)
                                    if (delayMs > 5) { 
                                        await new Promise(resolve => setTimeout(resolve, delayMs));
                                    }
                                    
                                    // 更新上次交付时间点
                                    lastChunkTime = Date.now(); 
                                    
                                    // 交付数据块 (Burst)
                                    controller.enqueue(chunk.slice(offset, offset + bytesToProcess));
                                    threadState.totalBytes += bytesToProcess; // 实时更新已下载字节数
                                    offset += bytesToProcess;
                                }
                            }
                        });
                    }

                    // --- 核心单线程启动逻辑 ---
                    async function performSpeedTest(targetUrl, limitBps, limitValue, limitUnit) {
                        
                        if (isTestRunning) return; 

                        isTestRunning = true;
                        document.getElementById('startTestButton').disabled = true;
                        
                        // 重置全局变量和单线程状态
                        testStartTime = Date.now();
                        lastUpdateTime = testStartTime;
                        lastTotalBytes = 0;
                        threadState = { id: 1, totalBytes: 0, testStartTime: 0, abortController: new AbortController(), status: 'PENDING' };
                        
                        const limitText = limitValue === 0 ? '无限速' : \`\${limitValue} \${limitUnit}/s\`;
                        let actualChunkSizeB = 0;

                        // **块大小逻辑：根据限速速率进行自适应调整 (核心计算逻辑)**
                        if (limitBps >= HIGH_SPEED_LIMIT_BPS) {
                            // 1. 高速限速 (>= 2 MB/s)：使用限速的 1/20 (5%) 作为块大小，以保证平滑性
                            actualChunkSizeB = Math.round(limitBps / 20); 

                        } else if (limitBps > 0) {
                             // 2. 低速限速 (> 0 且 < 2 MB/s)：块大小 = 限速速率本身
                            actualChunkSizeB = Math.round(limitBps);
                            
                            // 确保块大小至少为 1KB
                            if (actualChunkSizeB < KB) actualChunkSizeB = KB;

                        } else {
                            // 3. 无限速 (limitBps=0)：使用固定的 10 MB 大块
                            actualChunkSizeB = HIGH_SPEED_FIXED_CHUNK_B; 
                        }
                        
                        // 确保块大小的最小安全检查
                        if (actualChunkSizeB < 1024) actualChunkSizeB = 1024; // 至少 1 KB

                        document.getElementById('resultDiv').innerHTML = \`
                            <div>🚀 开始测速:</div>
                            <ul>
                                <li>线程数: 1 (固定)</li>
                                <li>限速: \${limitText} (\${(limitBps / MB).toFixed(2)} MB/s)</li>
                                <li><strong>实际限速块大小: \${formatBytes(actualChunkSizeB)}</strong></li>
                            </ul>
                        \`;
                        
                        // 1. 启动 UI 刷新 Timer
                        intervalTimer = setInterval(() => {
                            updateStatus(threadState.totalBytes);
                        }, UPDATE_INTERVAL_MS);
                        
                        // 2. 启动单线程测试
                        performSingleThreadTest(targetUrl, limitBps, actualChunkSizeB);
                    }

                    /**
                     * 单线程测速逻辑 
                     */
                    async function performSingleThreadTest(targetUrl, limitBps, actualChunkSizeB) {
                        
                        threadState.status = 'RUNNING';
                        threadState.testStartTime = Date.now();
                        
                        const proxyUrl = \`${workerBaseUrl}?target=\${encodeURIComponent(targetUrl)}\`;
                        
                        try {
                            const response = await fetch(proxyUrl, {
                                method: 'GET',
                                signal: threadState.abortController.signal 
                            });

                            if (!response.ok || !response.body) {
                                throw new Error(\`Worker response not ok: \${response.status}\`);
                            }

                            // 使用实际的块大小创建限速器
                            const rateLimiter = createRateLimiter(limitBps, actualChunkSizeB);
                            
                            // 关键：将 Response body 管道连接到限速器
                            const limitedStream = response.body.pipeThrough(rateLimiter);
                            const reader = limitedStream.getReader();
                            
                            while (true) {
                                const { done, value } = await reader.read();

                                if (done) {
                                    threadState.status = 'COMPLETE';
                                    break;
                                }
                                // 字节数累加在 TransformStream 内部完成
                            }

                        } catch (error) {
                            if (error.name !== 'AbortError') {
                                threadState.status = \`ERROR: \${error.message}\`;
                                console.error(\`Test Error:\`, error);
                                updateStatus(threadState.totalBytes, 'ERROR');
                            } else {
                                threadState.status = 'ABORTED';
                            }
                        } finally {
                            // 最终更新状态
                            updateStatus(threadState.totalBytes, (threadState.status === 'COMPLETE' || threadState.status.includes('ERROR') || threadState.status === 'ABORTED') ? 'FINISHED' : null);
                        }
                    }

                    // --- 事件监听器 ---
                    const limitValueInput = document.getElementById('limitValue');
                    const limitUnitSelect = document.getElementById('limitUnit');
                    
                    document.getElementById('testForm').addEventListener('submit', function(e) {
                        e.preventDefault();
                        
                        if (isTestRunning) return; 

                        if (intervalTimer) clearInterval(intervalTimer);
                        
                        const targetUrl = document.getElementById('targetUrl').value.trim();
                        
                        const limitValue = parseFloat(limitValueInput.value.trim());
                        const limitUnit = limitUnitSelect.value;
                        
                        // 1. 计算 Bps (Bytes per second)
                        let limitMultiplier = limitUnit === 'MB' ? MB : KB;
                        let limitBps = 0; 
                        if (limitValue > 0) {
                            limitBps = limitValue * limitMultiplier;
                        }

                        // 2. 启动测试
                        performSpeedTest(targetUrl, limitBps, limitValue, limitUnit);
                    });
                    
                    // --- Copy Link Listener ---
                    document.getElementById('copyLinkButton').addEventListener('click', function() {
                        const targetUrl = document.getElementById('targetUrl').value.trim();
                        const directLink = \`${workerBaseUrl}?target=\${encodeURIComponent(targetUrl)}\`;
                        
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