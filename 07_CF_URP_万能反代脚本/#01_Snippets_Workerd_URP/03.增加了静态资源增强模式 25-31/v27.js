const AUTH_PREFIX = '/SP3eHm618kN71DD';
const STATIC_PATH_PART = '/static/';

// 1. 对应 Nginx 的 map $extension $detect_content_type
const MIME_MAP = {
    'appcache': 'text/cache-manifest', 'manifest': 'text/cache-manifest', 'atom': 'application/atom+xml',
    'bat': 'application/x-msdownload', 'coffee': 'text/coffeescript', 'css': 'text/css', 'csv': 'text/csv',
    'eot': 'application/vnd.ms-fontobject', 'geojson': 'application/vnd.geo+json', 'hbs': 'text/x-handlebars-template',
    'handlebars': 'text/x-handlebars-template', 'htc': 'text/x-component', 'htm': 'text/html', 'html': 'text/html',
    'ics': 'text/calendar', 'jscad': 'application/javascript', 'json': 'application/json', 'jsonld': 'application/ld+json',
    'kml': 'application/vnd.google-earth.kml+xml', 'md': 'text/markdown', 'markdown': 'text/markdown',
    'js': 'application/javascript', 'mjs': 'application/javascript', 'mhtml': 'multipart/related', 'n3': 'text/n3',
    'nt': 'application/n-triples', 'otf': 'font/otf', 'owl': 'application/rdf+xml', 'rdf': 'application/rdf+xml',
    'pdf': 'application/pdf', 'rss': 'application/rss+xml', 'shex': 'text/shex', 'shexc': 'text/shex',
    'svg': 'image/svg+xml', 'swf': 'application/x-shockwave-flash', 'stl': 'model/stl', 'ttc': 'application/x-font-ttf',
    'ttf': 'application/x-font-ttf', 'ttl': 'text/turtle', 'vcard': 'text/vcard', 'vcf': 'text/x-vcard',
    'vtt': 'text/vtt', 'woff': 'application/font-woff', 'woff2': 'application/font-woff2', 'xhtml': 'application/xhtml+xml',
    'xht': 'application/xhtml+xml', 'xml': 'text/xml', 'txt': 'text/plain', 'xsl': 'application/xml',
    'xsd': 'application/xml', 'xslt': 'application/xslt+xml', 'yaml': 'text/yaml', 'yml': 'text/yaml',
    'wasm': 'application/wasm', 'rpm': 'application/x-redhat-package-manager', 'drpm': 'application/x-redhat-package-manager',
    'srpm': 'application/x-redhat-package-manager'
};

const NO_CHARSET_EXTENSIONS = new Set([
    'bat', 'eot', 'htc', 'kml', 'nt', 'otf', 'pdf', 'svg', 'swf', 
    'ttc', 'ttf', 'woff', 'woff2', 'wasm', 'rpm', 'drpm', 'srpm'
]);

export default {
    async fetch(request) {
        const url = new URL(request.url);
        
        if (url.pathname === '/favicon.ico' || url.pathname.endsWith('.png') || url.pathname.endsWith('.ico')) {
            return new Response(null, { status: 404 });
        }

        const targetQueryUrl = url.searchParams.get('url');
        if (targetQueryUrl) {
            let targetPath = targetQueryUrl.replace(/^https?:\/\//i, '');
            const newProxyPath = AUTH_PREFIX + '/https://' + targetPath;
            return Response.redirect(url.origin + newProxyPath, 302);
        }

        let path = url.pathname;
        const search = url.search;
        const hash = url.hash;

        const cleanPrefix = AUTH_PREFIX.replace(/^\/+|\/+$/g, '');
        let isStaticMode = false;

        if (path === '/' + cleanPrefix || path === '/' + cleanPrefix + '/') {
            path = '/';
        } else if (path.startsWith('/' + cleanPrefix + '/')) {
            let subPath = path.substring(cleanPrefix.length + 1); 
            if (subPath.startsWith(STATIC_PATH_PART)) {
                isStaticMode = true;
                path = subPath.substring(STATIC_PATH_PART.length - 1);
            } else {
                path = subPath;
            }
        } else {
            return trigger_real_cloudflare_1101_error_by_undefined_variable;
        }
        
        // 3. 帮助主页说明文档（严格按照您的要求，双格式点击链接）
        if (path === '/' && search === '') {
            const prefixNormal = `${url.origin}${AUTH_PREFIX.replace(/\/$/, '')}`; 
            const prefixStatic = `${url.origin}${AUTH_PREFIX.replace(/\/$/, '')}/static`; 
            
            if (request.method === 'HEAD') {
                return new Response(null, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            }

            const dynamicHelpText = `<!DOCTYPE html>
<html>
<head>
    <title>Proxy Control Panel</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body{font-family:sans-serif;max-width:750px;margin:30px auto;padding:0 20px;color:#333;line-height:1.6}
        .section{margin-bottom:35px;background:#fcfcfc;padding:20px;border-radius:6px;border:1px solid #e0e0e0}
        .title{font-weight:bold;font-size:15px;margin-bottom:10px;color:#111}
        .form-group{display:flex;margin:12px 0}
        input{flex:1;padding:10px;font-size:14px;border:1px solid #ccc;border-radius:4px 0 0 4px;outline:none}
        button{padding:10px 20px;background:#0288d1;color:#fff;border:none;border-radius:0 4px 4px 0;cursor:pointer;font-weight:bold;font-size:14px}
        button:hover{background:#0277bd}
        .sample-box{font-size:13px;color:#555;background:#f4f4f4;padding:12px;border-radius:4px;white-space:pre-wrap;word-break:break-all}
        .sample-box a{color:#0288d1;text-decoration:none;display:block;margin-bottom:4px}
        .sample-box a:last-child{margin-bottom:0}
        .sample-box a:hover{text-decoration:underline}
    </style>
</head>
<body>
    <h2>Proxy Control Panel</h2>

    <div class="section">
        <div class="title">普通模式: (不修改标头, RAW模式, 原始模式)</div>
        <form onsubmit="go(event, '${prefixNormal}/')">
            <div class="form-group">
                <input type="text" placeholder="输入完整目标 URL" required>
                <button type="submit">Go!</button>
            </div>
        </form>
        <div class="title" style="font-size:13px;margin-bottom:5px;">拼接示例:</div>
        <div class="sample-box"><a href="${prefixNormal}/https://github.com/2dust/v2rayN" target="_blank">${prefixNormal}/https://github.com/2dust/v2rayN</a><a href="${prefixNormal}/https/github.com/2dust/v2rayN" target="_blank">${prefixNormal}/https/github.com/2dust/v2rayN</a></div>
    </div>

    <div class="section">
        <div class="title">静态内容增强模式 (修正标头渲染):</div>
        <form onsubmit="go(event, '${prefixStatic}/')">
            <div class="form-group">
                <input type="text" placeholder="输入完整目标静态 URL" required>
                <button type="submit">Go!</button>
            </div>
        </form>
        <div class="title" style="font-size:13px;margin-bottom:5px;">拼接示例:</div>
        <div class="sample-box"><a href="${prefixStatic}/https://gist.githubusercontent.com/Tmalll/74f08eaff7dfdb21f547a71af2596498/raw/7.10.html" target="_blank">${prefixStatic}/https://gist.githubusercontent.com/Tmalll/74f08eaff7dfdb21f547a71af2596498/raw/7.10.html</a><a href="${prefixStatic}/https/gist.githubusercontent.com/Tmalll/74f08eaff7dfdb21f547a71af2596498/raw/7.10.html" target="_blank">${prefixStatic}/https/gist.githubusercontent.com/Tmalll/74f08eaff7dfdb21f547a71af2596498/raw/7.10.html</a></div>
    </div>

    <script>
        function go(e, p){
            e.preventDefault();
            let u = e.target.querySelector('input').value.trim();
            if(!u) return;
            if(!/^https?:\/\//i.test(u) && !/^https?\//i.test(u)){
                u = 'https://' + u;
            }
            window.open(p + u, '_blank');
        }
    </script>
</body>
</html>`;
            return new Response(dynamicHelpText, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }        
        
        if (path.startsWith("/https://") || path.startsWith("/http://")) {
            let fixedPath = path.replace(/:\/\//, "/"); 
            const currentPrefix = isStaticMode ? `${AUTH_PREFIX}/static` : AUTH_PREFIX;
            return Response.redirect(url.origin + currentPrefix + fixedPath + search + hash, 302);
        }

        let targetPath = path.slice(1) + search + hash;
        if (!targetPath) {
            return trigger_real_cloudflare_1101_error_by_undefined_variable;
        }

        let target;
        let referer = request.headers.get('Referer');
        let isApiCall = false;

        if (targetPath.startsWith("https/") || targetPath.startsWith("http/")) {
            let fullTarget = targetPath.replace(/^([a-z]+)\//, "$1://");
            try { target = new URL(fullTarget); } catch { return new Response("Invalid target URL", { status: 400 }); }
        }
        else if (referer && (targetPath.startsWith("_graphql") || targetPath.startsWith("_filter"))) {
            isApiCall = true;
            try {
                let refererUrl = new URL(referer);
                let refererPath = refererUrl.pathname.slice(1);
                let parts = refererPath.split('/');
                let startIndex = AUTH_PREFIX ? AUTH_PREFIX.split('/').length - 1 : 0;
                if (refererUrl.pathname.includes(STATIC_PATH_PART)) { startIndex += 1; }
                if (parts.length < startIndex + 2) { return new Response("Invalid referer path", { status: 400 }); }
                target = new URL(`${parts[startIndex]}://${parts[startIndex + 1]}/${targetPath}`);
            } catch (e) {
                return new Response("Error parsing referer", { status: 400 });
            }
        }
        else {
            return trigger_real_cloudflare_1101_error_by_undefined_variable;
        }

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
            headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.87 Safari/537.36');
            headers.set('X-Requested-With', 'XMLHttpRequest');
            if (isApiCall) {
                headers.set('Accept', 'application/json');
                headers.delete('Content-Type');
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

        if (upstream.status >= 300 && upstream.status < 400 && upstream.headers.get("Location")) {
            const loc = new URL(upstream.headers.get("Location"), target).href;
            const currentPrefix = isStaticMode ? `${AUTH_PREFIX}/static` : AUTH_PREFIX;
            const pathSegment = currentPrefix + "/" + target.protocol.slice(0, -1) + "/";
            return Response.redirect(url.origin + "/" + loc.replace(/^https?:\/\//i, pathSegment.slice(1)), 302);
        }

        const respHeaders = new Headers(upstream.headers);
        ["content-security-policy", "permissions-policy", "cross-origin-embedder-policy", "cross-origin-resource-policy", "x-frame-options", "content-disposition", "x-content-type-options"].forEach(h => {
            respHeaders.delete(h);
            respHeaders.delete(h + "-report-only");
        });
        respHeaders.set("access-control-allow-origin", "*");

        // --- 静态内容增强模式专属的 Header 覆盖判定 ---
        if (isStaticMode) {
            const pathSegments = target.pathname.split('/');
            const lastSegment = pathSegments[pathSegments.length - 1] || "";
            const extMatch = lastSegment.match(/\.([a-zA-Z0-9]+)$/);
            const extension = extMatch ? extMatch[1].toLowerCase() : "";

            if (MIME_MAP.hasOwnProperty(extension)) {
                const detectedMime = MIME_MAP[extension];
                const charsetStr = NO_CHARSET_EXTENSIONS.has(extension) ? "" : "; charset=utf-8";
                respHeaders.set("Content-Type", `${detectedMime}${charsetStr}`);
                respHeaders.set("X-Githack-Cache-Status", "HIT_WORKER_MODIFIED");
                if (upstream.status >= 200 && upstream.status < 300) {
                    respHeaders.set("Cache-Control", "max-age=31536000, public, immutable");
                }
            } else {
                respHeaders.set("Cache-Control", "max-age=86400, public");
            }
        }

        // --- 核心改动：普通模式与静态模式均进入相同的 HTML 路径替换过滤层 ---
        const ct = upstream.headers.get("content-type") || "";
        if (ct.includes("text/html")) {
            let html = await upstream.text();
            
            // 动态决定替换时使用的前缀（静态模式带 /static，普通模式不带）
            const currentPrefix = isStaticMode ? `${AUTH_PREFIX}/static` : AUTH_PREFIX;
            const simplePrefix = currentPrefix + "/" + target.protocol.slice(0, -1) + "/" + target.hostname;

            html = html.replace(
                /\b(href|src|action|data-url|data-pjax|data-turbo-frame)=["']\/([^\/][^"']*)/gi,
                `$1="${simplePrefix}/$2"`
            );

            const targetOriginEscaped = target.origin.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const targetOriginRegex = new RegExp(targetOriginEscaped + '(?=[\/"\'])', 'gi');
            html = html.replace(targetOriginRegex, simplePrefix);

            if (target.hostname.includes('github.com')) {
                const jsFixScript = `<script>(function(){const prefix="${simplePrefix}";const pathStart=window.location.pathname.substring(prefix.length).split('/').slice(0,3).join('/');function fixUrl(urlString){if(typeof urlString==='string'&&!urlString.startsWith(prefix)){if(urlString.startsWith(pathStart)&&pathStart.length>2){return prefix+urlString;}else if(urlString.startsWith('/_')){return prefix+urlString;}}return urlString;}const originalFetch=window.fetch;window.fetch=function(input,init){if(typeof input==='string'){input=fixUrl(input);}return originalFetch(input,init);};const originalXhrOpen=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url,...rest){url=fixUrl(url);originalXhrOpen.call(this,method,url,...rest);};})();</script>`;
                html = html.replace('</head>', jsFixScript + '</head>');
            }

            return new Response(html, { status: upstream.status, headers: respHeaders });
        }

        return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
    }
};