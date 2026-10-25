// 请求网址变成 https://mw4ddy26y93a874.proxy.xyz/https/github.com/2dust/v2rayN 这种格式
export default {
      async fetch(request) {
        const url = new URL(request.url);
    
        let targetPath = url.pathname.slice(1) + url.search + url.hash;
        if (!targetPath) {
          return new Response("Bad Request", { status: 400 });
        }
        
        // ✨ 1. 关键修改：兼容新的 URL 格式，并将目标 URL 恢复到标准格式
        //    将 /https/github.com/path 恢复为 https://github.com/path
        //    将 /http/example.com/path 恢复为 http://example.com/path
        if (targetPath.startsWith("https/") || targetPath.startsWith("http/")) {
            targetPath = targetPath.replace(/^([a-z]+)\//, "$1://");
        }
    
        // 如果不是完整的协议，则默认为 https://
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
          // 排除 host, origin, referer
          if (!/^(host|origin|referer)$/i.test(key)) {
            headers.set(key, value.replace(url.origin, target.origin));
          }
        });
        
        // ✨ 2. 关键修复：伪造头部，解决 403 Forbidden 问题
        headers.set("Host", target.hostname);
        headers.set("Referer", target.origin); 
        headers.set("Origin", target.origin); 
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
          // 注意：这里需要将重定向目标 URL 重新转换为新的 /https/ 格式
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
    
        // 🔧 关键修复点：重写 HTML 路径 (使用正则表达式)
        if (ct.includes("text/html")) {
          let html = await upstream.text();
          
          // 目标代理路径前缀：/https/github.com (使用新的简化格式)
          // target.protocol = "https:"
          const simplePrefix = "/" + target.protocol.slice(0, -1) + "/" + target.hostname; 
          
          // 1. 扩展重写以单斜杠开头的相对路径 (例如 /path -> /https/github.com/path)
          html = html.replace(
            // 匹配所有可能的 URL 属性
            /\b(href|src|action|data-url|data-pjax|data-turbo-frame)=["']\/(?!\/)/gi,
            `$1="${simplePrefix}/`
          );
          
          // 2. 重写目标域名的绝对路径 (例如 https://github.com/... -> /https/github.com/...)
          const targetOriginEscaped = target.origin.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const targetOriginRegex = new RegExp(targetOriginEscaped, 'gi');
    
          // 使用新的简化前缀替换目标 Origin
          html = html.replace(targetOriginRegex, simplePrefix);
    
    
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