// constants 保持不变
const DEFAULT_TARGET_URL = "http://speedtest.tyo11.jp.leaseweb.net/10000mb.bin";

// Worker 核心逻辑：保持不变
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
                cf: { stream: true }, 
                keepalive: true
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
// HTML 配置页面及客户端 JS 逻辑 (默认单位改为 MB)
// =========================================================================

function getHtmlContent(urlList, workerBaseUrl) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cloudflare 下载性能测速 (自定义限速和块大小)</title>
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
                .thread-status { font-size: 0.9em; margin-top: 10px; border-top: 1px dashed #eee; padding-top: 10px; }
                .thread-item { margin-bottom: 5px; }
            </style>
        </head>
        <body>
            <h1>Cloudflare 下载性能测速 (自定义限速和块大小)</h1>
            <p class="note">Workers 后端仅做无限速反代。多线程、限速和块控制在浏览器前端实现。</p>
            
            <form id="testForm">
                
                <div class="form-group">
                    <label for="threads">下载线程数 (Threads, 默认1):</label>
                    <input type="number" id="threads" value="1" min="1" required>
                </div>

                <div class="form-group">
                    <label for="limitValue">单位选择:</label>
                    <div class="input-group">
                        <select id="commonUnit">
                            <option value="KB">KB/s (限速) / KB (块大小)</option>
                            <option value="MB" selected>MB/s (限速) / MB (块大小)</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="limitValue">客户端限速 (速率，每个线程独立):</label>
                    <div class="input-group">
                        <input type="number" id="limitValue" value="1" min="0" step="any" required>
                    </div>
                    <div class="note">输入 0 为无限速。单位由上方选择框决定。</div>
                </div>

                <div class="form-group">
                    <label for="chunkValue">限速块大小 (Chunk Size，数据量):</label>
                    <div class="input-group">
                        <input type="number" id="chunkValue" value="1" min="0.001" step="any" required>
                    </div>
                    <div class="note">限速时，每次推送的数据量。单位由上方选择框决定。</div>
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
                    
                    // --- 状态变量 ---
                    let testStartTime = 0;
                    let lastUpdateTime = 0;
                    let lastTotalBytes = 0;
                    let isTestRunning = false;
                    let intervalTimer = null; 
                    const UPDATE_INTERVAL_MS = 100; 
                    
                    let threadStates = []; 

                    // --- 辅助函数 ---
                    function formatSpeed(bytesPerSecond) {
                        if (bytesPerSecond >= MB) {
                            return (bytesPerSecond / MB).toFixed(2) + ' <span class="speed-unit">MB/s</span>';
                        }
                        return (bytesPerSecond / KB).toFixed(2) + ' <span class="speed-unit">KB/s</span>';
                    }
                    
                    /**
                     * 状态更新 (全局和每个线程)
                     */
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
                        const totalThreads = threadStates.length;
                        const completedThreads = threadStates.filter(t => t.status === 'COMPLETE').length;

                        // 更新主速度显示
                        realtimeSpeedDiv.innerHTML = formatSpeed(instantSpeedBPS);

                        let threadStatusHtml = '';
                        threadStates.forEach(thread => {
                            const threadTimeElapsed = (currentTime - thread.testStartTime) / 1000;
                            const threadAverageSpeedBPS = (threadTimeElapsed > 0) ? (thread.totalBytes / threadTimeElapsed) : 0;
                            let statusColor;
                            if (thread.status === 'COMPLETE') statusColor = 'green';
                            else if (thread.status === 'ERROR') statusColor = 'red';
                            else if (thread.status === 'RUNNING') statusColor = 'blue';
                            else statusColor = '#666';

                            threadStatusHtml += \`
                                <div class="thread-item">
                                    <span style="color: \${statusColor};">线程 \${thread.id} (\${thread.status}):</span>
                                    下载: \${(thread.totalBytes / MB).toFixed(2)} MB | 
                                    平均速度: \${formatSpeed(threadAverageSpeedBPS)}
                                </div>
                            \`;
                        });
                        
                        // 更新结果面板
                        resultDiv.innerHTML = \`
                            <div><strong>总瞬时速度:</strong> <span class="speed-value">\${formatSpeed(instantSpeedBPS)}</span></div>
                            <div><strong>总平均速度:</strong> \${formatSpeed(averageSpeedBPS)}</div>
                            <div>总下载: \${(currentTotalBytes / MB).toFixed(2)} MB</div>
                            <div>已运行: \${timeElapsed.toFixed(1)} 秒</div>
                            <div>线程状态: \${completedThreads}/\${totalThreads} 完成</div>
                            <div class="thread-status">\${threadStatusHtml}</div>
                        \`;
                        
                        // 更新状态变量 (非终止状态)
                        if (!terminationReason) {
                            lastUpdateTime = currentTime;
                            lastTotalBytes = currentTotalBytes;
                        }

                        if (terminationReason || completedThreads === totalThreads) {
                            if (intervalTimer) clearInterval(intervalTimer);
                            isTestRunning = false;
                            
                            realtimeSpeedDiv.innerHTML = formatSpeed(averageSpeedBPS);
                            resultDiv.innerHTML += \`<div style="font-size: 1.2em; margin-top: 10px;"><strong>最终总平均速度:</strong> <span style="color: #007bff;">\${formatSpeed(averageSpeedBPS)}</span></div>\`;

                            let terminationMessage = '';
                            if (completedThreads === totalThreads) {
                                terminationMessage = \`<div style="color: green; font-weight: bold;">✅ 总测速完成：所有 \${totalThreads} 个线程下载完毕。</div>\`;
                            } else if (terminationReason === 'ERROR') {
                                terminationMessage = \`<div style="color: red;">❌ 测速错误: 网络中断或服务器错误。</div>\`;
                            }
                            resultDiv.innerHTML += terminationMessage;
                            
                            startButton.textContent = "重新开始测速";
                            startButton.disabled = false;
                        }
                    }
                    
                    /**
                     * 限速 TransformStream (支持浮点数块大小)
                     * @param {number} limitBps - 限速值 (Bytes/s)
                     * @param {number} userChunkSizeB - 用户指定的块大小 (Bytes) - 允许浮点数
                     */
                    function createRateLimiter(limitBps, userChunkSizeB) {
                        const LIMIT_CHUNK_SIZE = userChunkSizeB; // 直接使用精确的字节数

                        // 检查并返回无限速 (至少 1KB/s 限速和 1 Byte 块)
                        if (limitBps < KB || LIMIT_CHUNK_SIZE <= 0) { 
                            return new TransformStream(); 
                        }

                        // 1. 计算目标延迟时间 (ms)
                        const TARGET_DELAY_MS = (LIMIT_CHUNK_SIZE / limitBps) * 1000;
                        
                        let lastChunkTime = Date.now();
                        
                        return new TransformStream({
                            async transform(chunk, controller) {
                                let offset = 0;
                                
                                while (offset < chunk.length) {
                                    // 计算本次应处理的字节数，并确保是整数 (向下取整最安全)
                                    const rawBytesToProcess = Math.min(LIMIT_CHUNK_SIZE, chunk.length - offset);
                                    const bytesToProcess = Math.floor(rawBytesToProcess);

                                    if (bytesToProcess === 0) {
                                        offset = chunk.length; 
                                        break;
                                    }
                                    
                                    // 动态计算实际需要等待的时间
                                    const expectedNextTime = lastChunkTime + TARGET_DELAY_MS;
                                    let delayMs = Math.max(0, expectedNextTime - Date.now());
                                    
                                    // 延迟
                                    if (delayMs > 5) { 
                                        await new Promise(resolve => setTimeout(resolve, delayMs));
                                    }
                                    
                                    // 更新时间和数据
                                    lastChunkTime = Date.now();
                                    
                                    // 推送子块
                                    controller.enqueue(chunk.slice(offset, offset + bytesToProcess));
                                    offset += bytesToProcess;
                                }
                            }
                        });
                    }

                    // --- 核心多线程启动逻辑 ---
                    async function performSpeedTest(targetUrl, threads, limitBps, limitValue, chunkValue, commonUnit) {
                        
                        if (isTestRunning) return; 

                        isTestRunning = true;
                        document.getElementById('startTestButton').disabled = true;
                        
                        // 重置全局变量
                        threadStates = [];
                        testStartTime = Date.now();
                        lastUpdateTime = testStartTime;
                        lastTotalBytes = 0;
                        
                        const limitText = limitValue === 0 ? '无限速' : \`\${limitValue} \${commonUnit}/s\`;
                        const chunkText = \`\${chunkValue} \${commonUnit}\`;
                        
                        let unitMultiplier;
                        if (commonUnit === 'MB') unitMultiplier = MB;
                        else unitMultiplier = KB;

                        const userChunkSizeB = chunkValue * unitMultiplier;

                        document.getElementById('resultDiv').innerHTML = \`
                            <div>🚀 开始测速:</div>
                            <ul>
                                <li>线程数: \${threads}</li>
                                <li>限速: \${limitText} (\${(limitBps / MB).toFixed(2)} MB/s)</li>
                                <li>**限速块大小**: \${chunkText} (\${(userChunkSizeB).toFixed(2)} B)</li>
                            </ul>
                        \`;
                        
                        // 1. 启动 UI 刷新 Timer
                        intervalTimer = setInterval(() => {
                            const totalBytesDownloaded = threadStates.reduce((sum, t) => sum + t.totalBytes, 0);
                            updateStatus(totalBytesDownloaded);
                        }, UPDATE_INTERVAL_MS);
                        
                        // 2. 启动所有线程
                        for (let i = 1; i <= threads; i++) {
                            const newState = { 
                                id: i, 
                                totalBytes: 0, 
                                testStartTime: 0, 
                                abortController: new AbortController(), 
                                status: 'PENDING' 
                            };
                            threadStates.push(newState);
                            
                            setTimeout(() => {
                                if (isTestRunning) { 
                                    performSingleThreadTest(i, targetUrl, limitBps, userChunkSizeB);
                                }
                            }, (i - 1) * 500); 
                        }
                    }

                    /**
                     * 单线程测速逻辑 
                     */
                    async function performSingleThreadTest(threadId, targetUrl, limitBps, userChunkSizeB) {
                        
                        const threadState = threadStates.find(t => t.id === threadId);
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

                            const rateLimiter = createRateLimiter(limitBps, userChunkSizeB);
                            const limitedStream = response.body.pipeThrough(rateLimiter);
                            const reader = limitedStream.getReader();

                            while (true) {
                                const { done, value } = await reader.read();

                                if (done) {
                                    threadState.status = 'COMPLETE';
                                    break;
                                }

                                threadState.totalBytes += value.length;
                            }

                        } catch (error) {
                            if (error.name !== 'AbortError') {
                                threadState.status = 'ERROR';
                                console.error(\`Thread \${threadId} Error:\`, error);
                                updateStatus(threadStates.reduce((sum, t) => sum + t.totalBytes, 0), 'ERROR');
                            } else {
                                threadState.status = 'ABORTED';
                            }
                        }
                        
                        if (threadState.status === 'COMPLETE' || threadState.status === 'ERROR') {
                            const totalBytesDownloaded = threadStates.reduce((sum, t) => sum + t.totalBytes, 0);
                            updateStatus(totalBytesDownloaded);
                        }
                    }

                    // --- 事件监听器 ---
                    document.getElementById('testForm').addEventListener('submit', function(e) {
                        e.preventDefault();
                        
                        if (isTestRunning) return; 

                        if (intervalTimer) clearInterval(intervalTimer);
                        
                        const threads = parseInt(document.getElementById('threads').value.trim()) || 1;
                        const commonUnit = document.getElementById('commonUnit').value;
                        
                        // 使用 parseFloat 处理输入
                        const limitValue = parseFloat(document.getElementById('limitValue').value.trim());
                        const chunkValue = parseFloat(document.getElementById('chunkValue').value.trim());
                        
                        const targetUrl = document.getElementById('targetUrl').value.trim();
                        
                        let unitMultiplier;
                        if (commonUnit === 'MB') {
                            unitMultiplier = MB;
                        } else {
                            unitMultiplier = KB;
                        }

                        // 1. 计算 Bps (Bytes per second)
                        let limitBps = 0; 
                        if (limitValue > 0) {
                            limitBps = limitValue * unitMultiplier;
                        }

                        // 2. 计算用户指定的块大小 (Bytes)
                        let userChunkSizeB = chunkValue * unitMultiplier;
                        
                        // 最小安全检查：块大小不能小于 1 字节
                        if (userChunkSizeB <= 0) {
                             userChunkSizeB = 1; 
                        }

                        // 3. 启动测试
                        performSpeedTest(targetUrl, threads, limitBps, limitValue, chunkValue, commonUnit);
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