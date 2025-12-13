export default {
    async fetch(request) {
     const url = new URL(request.url);
     let targetPath = url.pathname.slice(1) + url.search + url.hash;
     if (!targetPath) {
      return new Response("Bad Request", { status: 400 });
     }
   
     let target;
     let referer = request.headers.get('Referer');
     let isApiCall = false; // 标记是否为 /_filter, /_graphql 等 API 调用
   
     // 1. 检查是否为完整代理路径 (/https/github.com/path)
     if (targetPath.startsWith("https/") || targetPath.startsWith("http/")) {
       let fullTarget = targetPath.replace(/^([a-z]+)\//, "$1://");
       try {
         target = new URL(fullTarget);
       } catch {
         return new Response("Invalid target URL in path", { status: 400 });
       }
     } 
     // 2. 检查是否为 Issues 页面发出的、错误的根路径 AJAX 调用 (如 /_filter/...)
     else if (referer && (targetPath.startsWith("_graphql") || targetPath.startsWith("_filter"))) {
       isApiCall = true;
       try {
           // 从 Referer 中提取目标域名，Referer 格式是: https://worker.xyz/https/github.com/...
           let refererUrl = new URL(referer);
           let refererPath = refererUrl.pathname.slice(1); // 得到 https/github.com/...
           
           // 提取目标协议和域名
           let parts = refererPath.split('/');
           if (parts.length < 2) {
                return new Response("Invalid referer path for API call", { status: 400 });
           }
           let protocol = parts[0]; // e.g., https
           let hostname = parts[1]; // e.g., github.com
           
           // 构造正确的 target URL
           let fullTarget = `${protocol}://${hostname}/${targetPath}`;
           target = new URL(fullTarget);
   
       } catch (e) {
         return new Response("Error parsing referer for API call", { status: 400 });
       }
     }
     // 3. 既不是完整代理路径，也不是已知 API 调用
     else {
       return new Response("Unrecognized request format.", { status: 400 });
     }
   
     const headers = new Headers();
     request.headers.forEach((value, key) => {
      if (!/^(host|origin|referer)$/i.test(key)) {
       headers.set(key, value.replace(url.origin, target.origin));
      }
     });
   
     // 伪造 Host/Referer/Origin 头部
     headers.set("Host", target.hostname);
     headers.set("Referer", target.origin + "/"); 
     headers.set("Origin", target.origin); 
   
     if (target.hostname.includes('github.com')) {
      headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36');
      headers.set('X-Requested-With', 'XMLHttpRequest'); 
      // API 调用需要 application/json 类型的 Accept
      if (isApiCall) {
          headers.set('Accept', 'application/json');
          headers.delete('Content-Type'); // 避免发送错误的 Content-Type
      } else {
          headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'); 
      }
     }
   
     const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual"
     });
   
     if (
      upstream.status >= 300 &&
      upstream.status < 400 &&
      upstream.headers.get("Location")
     ) {
      const loc = new URL(upstream.headers.get("Location"), target).href;
      const newLoc = loc.replace(/^https?:\/\//i, target.protocol.slice(0, -1) + "/");
      return Response.redirect(url.origin + "/" + newLoc, 302);
     }
   
     const respHeaders = new Headers(upstream.headers);
     ["content-security-policy","permissions-policy","cross-origin-embedder-policy","cross-origin-resource-policy","x-frame-options"].forEach(h => {
      respHeaders.delete(h);
      respHeaders.delete(h + "-report-only");
     });
   
     respHeaders.set("access-control-allow-origin", "*");
   
     const ct = upstream.headers.get("content-type") || "";
   
     if (ct.includes("text/html")) {
      let html = await upstream.text();
      const simplePrefix = "/" + target.protocol.slice(0, -1) + "/" + target.hostname; 
      
      // 正则重写 (HTML属性)
      html = html.replace(
       /\b(href|src|action|data-url|data-pjax|data-turbo-frame)=["'](\/(?!\/))/gi,
       `$1="${simplePrefix}$2`
      );
      
      // 正则重写 (绝对路径)
      const targetOriginEscaped = target.origin.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const targetOriginRegex = new RegExp(targetOriginEscaped, 'gi');
      html = html.replace(targetOriginRegex, simplePrefix);
   
      if (target.hostname.includes('github.com')) {
       // 客户端 JS 注入 (覆盖 fetch 和 XHR)
       const jsFixScript = `
       <script>
         (function() {
             const prefix = "${simplePrefix}"; 
             const pathStart = window.location.pathname.substring(prefix.length).split('/').slice(0, 3).join('/');
             
             function fixUrl(urlString) {
                 if (typeof urlString === 'string' && !urlString.startsWith(prefix)) {
                     if (urlString.startsWith(pathStart) && pathStart.length > 2) {
                          return prefix + urlString;
                     }
                     else if (urlString.startsWith('/_')) {
                          return prefix + urlString;
                     }
                 }
                 return urlString;
             }
             
             const originalFetch = window.fetch;
             window.fetch = function(input, init) {
                 if (typeof input === 'string') {
                     input = fixUrl(input);
                 }
                 return originalFetch(input, init);
             };
   
             const originalXhrOpen = XMLHttpRequest.prototype.open;
             XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                 url = fixUrl(url);
                 originalXhrOpen.call(this, method, url, ...rest);
             };
   
         })();
       </script>`;
   
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