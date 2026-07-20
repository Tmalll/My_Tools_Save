// 【重要配置】请在此处设置您的认证前缀。
const AUTH_PREFIX = '/your_secure_token'; 

export default {
    async fetch(request) {
        const url = new URL(request.url);
        let path = url.pathname;
        let search = url.search;
        let hash = url.hash;
        
        // --- 1. 根路径和Token认证检查 ---
        
        if (path === '/' && search === '' && AUTH_PREFIX === '') {
            return new Response(null, { status: 403 });
        }
        
        if (AUTH_PREFIX) {
            if (path.startsWith(AUTH_PREFIX)) {
                path = path.substring(AUTH_PREFIX.length);
            } else {
                return new Response("403 Forbidden", { status: 403 });
            }
        }
        
        if (path === '/' && search === '') {
            return new Response(null, { status: 403 });
        }
        
        // --- 2. URL 格式修正（解决 /https:// 的问题） ---
        
        if (path.startsWith("/https://") || path.startsWith("/http://")) {
            let fixedPath = path.replace(/:\/\//, "/"); 
            
            // 修正：重定向时需要将 AUTH_PREFIX 重新加回
            const newUrl = url.origin + AUTH_PREFIX + fixedPath + search + hash;

            return Response.redirect(newUrl, 302);
        }
        // ------------------------------------------------

        let targetPath = path.slice(1) + search + hash;
        if (!targetPath) {
            return new Response("Bad Request", { status: 400 });
        }

        let target;
        let referer = request.headers.get('Referer');
        let isApiCall = false;

        // 3. 代理路径解析
        if (targetPath.startsWith("https/") || targetPath.startsWith("http/")) {
            let fullTarget = targetPath.replace(/^([a-z]+)\//, "$1://");
            try {
                target = new URL(fullTarget);
            } catch {
                return new Response("Invalid target URL in path", { status: 400 });
            }
        }
        else if (referer && (targetPath.startsWith("_graphql") || targetPath.startsWith("_filter"))) {
            isApiCall = true;
            try {
                let refererUrl = new URL(referer);
                let refererPath = refererUrl.pathname.slice(1);

                let parts = refererPath.split('/');
                let startIndex = AUTH_PREFIX ? AUTH_PREFIX.split('/').length - 1 : 0;
                
                if (parts.length < startIndex + 2) {
                    return new Response("Invalid referer path for API call", { status: 400 });
                }
                let protocol = parts[startIndex];
                let hostname = parts[startIndex + 1];

                let fullTarget = `${protocol}://${hostname}/${targetPath}`;
                target = new URL(fullTarget);
            } catch (e) {
                return new Response("Error parsing referer for API call", { status: 400 });
            }
        }
        else {
            return new Response("Unrecognized request format.", { status: 400 });
        }

        // 4. 头部处理
        const headers = new Headers();
        request.headers.forEach((value, key) => {
            if (!/^(host|origin|referer)$/i.test(key)) {
                headers.set(key, value.replace(url.origin, target.origin));
            }
        });

        headers.set("Host", target.hostname);
        headers.set("Referer", target.origin + "/");
        headers.set("Origin", target.origin);

        if (target.hostname.includes('github.com')) {
            headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36');
            headers.set('X-Requested-With', 'XMLHttpRequest');
            if (isApiCall) {
                headers.set('Accept', 'application/json');
                headers.delete('Content-Type');
            } else {
                headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
            }
        }

        // 5. 向上游发起请求
        const upstream = await fetch(target, {
            method: request.method,
            headers,
            body: request.body,
            redirect: "manual"
        });

        // 6. 响应处理
        if (
            upstream.status >= 300 &&
            upstream.status < 400 &&
            upstream.headers.get("Location")
        ) {
            const loc = new URL(upstream.headers.get("Location"), target).href;
            
            // 核心修正：确保 newLoc 以 / 开头，并包含 AUTH_PREFIX
            // 步骤 1: 将 loc 中的 http/https:// 替换为 AUTH_PREFIX/protocol/
            const pathSegment = AUTH_PREFIX + "/" + target.protocol.slice(0, -1) + "/";
            const newLocWithoutOrigin = loc.replace(/^https?:\/\//i, pathSegment.slice(1));
            
            // 步骤 2: 确保 newLoc 是一个绝对路径 (/开头)，并使用 Response.redirect
            const finalRedirectUrl = url.origin + "/" + newLocWithoutOrigin;
            
            return Response.redirect(finalRedirectUrl, 302);
        }

        const respHeaders = new Headers(upstream.headers);
        ["content-security-policy", "permissions-policy", "cross-origin-embedder-policy", "cross-origin-resource-policy", "x-frame-options"].forEach(h => {
            respHeaders.delete(h);
            respHeaders.delete(h + "-report-only");
        });

        respHeaders.set("access-control-allow-origin", "*");

        const ct = upstream.headers.get("content-type") || "";

        if (ct.includes("text/html")) {
            let html = await upstream.text();
            
            // 在 HTML 替换中，前缀必须包含 AUTH_PREFIX
            const simplePrefix = AUTH_PREFIX + "/" + target.protocol.slice(0, -1) + "/" + target.hostname;

            html = html.replace(
                /\b(href|src|action|data-url|data-pjax|data-turbo-frame)=["'](\/(?!\/))/gi,
                `$1="${simplePrefix}$2`
            );

            const targetOriginEscaped = target.origin.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const targetOriginRegex = new RegExp(targetOriginEscaped, 'gi');
            html = html.replace(targetOriginRegex, simplePrefix);

            if (target.hostname.includes('github.com')) {
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