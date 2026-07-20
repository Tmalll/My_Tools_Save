export default {
      async fetch(request) {
        const url = new URL(request.url);
    
        let targetPath = url.pathname.slice(1) + url.search + url.hash;
        if (!targetPath) {
          return new Response("Bad Request", { status: 400 });
        }
        
        // 1. 兼容新的 URL 格式，并将目标 URL 恢复到标准格式
        if (targetPath.startsWith("https/") || targetPath.startsWith("http/")) {
            targetPath = targetPath.replace(/^([a-z]+)\//, "$1://");
        }
    
        if (!/^https?:\/\//i.test(targetPath)) {
          targetPath = "https://" + targetPath;
        }
    
        let target;
        try {
          target = new URL(targetPath);
        } catch {
          return new Response("Invalid target URL", { status: 400 });
        }
    
        const headers = new Headers();
        request.headers.forEach((value, key) => {
          if (!/^(host|origin|referer)$/i.test(key)) {
            headers.set(key, value.replace(url.origin, target.origin));
          }
        });
        
        // 2. 伪造头部，解决 403 Forbidden 问题
        headers.set("Host", target.hostname);
        headers.set("Referer", target.origin + "/"); 
        headers.set("Origin", target.origin); 
        
        // 额外增强：添加 GitHub API 可能检查的头部
        if (target.hostname.includes('github.com')) {
            headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36');
            headers.set('X-Requested-With', 'XMLHttpRequest'); 
            headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'); 
        }
        // ----------------------------------------------------
    
        const upstream = await fetch(target, {
          method: request.method,
          headers,
          body: request.body,
          redirect: "manual"
        });
    
        // ... (重定向逻辑不变)
        if (
          upstream.status >= 300 &&
          upstream.status < 400 &&
          upstream.headers.get("Location")
        ) {
          const loc = new URL(upstream.headers.get("Location"), target).href;
          const newLoc = loc.replace(/^https?:\/\//i, target.protocol.slice(0, -1) + "/");
          return Response.redirect(url.origin + "/" + newLoc, 302);
        }
    
        // ... (响应头清理不变)
        const respHeaders = new Headers(upstream.headers);
        [
          "content-security-policy",
          "permissions-policy",
          "cross-origin-embedder-policy",
          "cross-origin-resource-policy",
          "x-frame-options"
        ].forEach(h => {
          respHeaders.delete(h);
          respHeaders.delete(h + "-report-only");
        });
    
        respHeaders.set("access-control-allow-origin", "*");
    
        const ct = upstream.headers.get("content-type") || "";
    
        // 🔧 关键修复点：重写 HTML 路径 (使用正则表达式和 JavaScript 注入)
        if (ct.includes("text/html")) {
          let html = await upstream.text();
          
          // 目标代理路径前缀：/https/github.com
          const simplePrefix = "/" + target.protocol.slice(0, -1) + "/" + target.hostname; 
          
          // 1. 重写以单斜杠开头的相对路径 (适用于 HTML 元素属性)
          html = html.replace(
            /\b(href|src|action|data-url|data-pjax|data-turbo-frame)=["'](\/(?!\/))/gi,
            `$1="${simplePrefix}$2`
          );
          
          // 2. 重写目标域名的绝对路径
          const targetOriginEscaped = target.origin.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const targetOriginRegex = new RegExp(targetOriginEscaped, 'gi');
          html = html.replace(targetOriginRegex, simplePrefix);
    
          // 3. 注入客户端 JavaScript 修复 (这是针对动态 API 路径的最终尝试)
          if (target.hostname.includes('github.com')) {
              const jsFixScript = `
              <script>
                (function() {
                    // 正确的代理前缀，例如 "/https/github.com"
                    const prefix = "${simplePrefix}"; 
                    // 目标路径：例如 "/2dust/v2rayN"
                    const pathStart = window.location.pathname.substring(prefix.length).split('/').slice(0, 3).join('/');
                    
                    // 仅在当前路径是 /owner/repo/ 格式时启用客户端修复
                    if (pathStart.length > 2) {
                        
                        // 备份原始 fetch 方法
                        const originalFetch = window.fetch;
    
                        // 覆盖 fetch 方法，在发送请求前修正路径
                        window.fetch = function(input, init) {
                            let urlString = input;
                            if (typeof input === 'object' && input instanceof Request) {
                                urlString = input.url;
                            }
                            
                            // 检查请求是否是以 /owner/repo 开头的相对路径，且未被 Worker 重写
                            if (typeof urlString === 'string' && urlString.startsWith(pathStart) && !urlString.startsWith(prefix)) {
                                 // 强制加上代理前缀，例如：/https/github.com/2dust/v2rayN/latest-commit/master
                                 input = prefix + urlString;
                            }
                            
                            return originalFetch(input, init);
                        };
                    }
                })();
              </script>`;
    
              // 将修复脚本插入到 </head> 标签之前
              html = html.replace('</head>', jsFixScript + '</head>');
          }
    
          return new Response(html, {
            status: upstream.status,
            headers: respHeaders
          });
        }
    
        return new Response(upstream.body, {
          status: upstream.status,
          headers: respHeaders
        });
      }
    };