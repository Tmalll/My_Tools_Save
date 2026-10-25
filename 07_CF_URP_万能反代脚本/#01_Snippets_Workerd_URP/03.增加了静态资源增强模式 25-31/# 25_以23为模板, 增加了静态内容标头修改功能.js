const AUTH_PREFIX = '/SP3eHm618kN71DD';
// 静态模式前缀路径定义
const STATIC_PATH_PART = '/static/';

// 1. 对应 Nginx 的 map $extension $detect_content_type
const MIME_MAP = {
    'appcache': 'text/cache-manifest',
    'manifest': 'text/cache-manifest',
    'atom': 'application/atom+xml',
    'bat': 'application/x-msdownload',
    'coffee': 'text/coffeescript',
    'css': 'text/css',
    'csv': 'text/csv',
    'eot': 'application/vnd.ms-fontobject',
    'geojson': 'application/vnd.geo+json',
    'hbs': 'text/x-handlebars-template',
    'handlebars': 'text/x-handlebars-template',
    'htc': 'text/x-component',
    'htm': 'text/html',
    'html': 'text/html',
    'ics': 'text/calendar',
    'jscad': 'application/javascript',
    'json': 'application/json',
    'jsonld': 'application/ld+json',
    'kml': 'application/vnd.google-earth.kml+xml',
    'md': 'text/markdown',
    'markdown': 'text/markdown',
    'js': 'application/javascript',
    'mjs': 'application/javascript',
    'mhtml': 'multipart/related',
    'n3': 'text/n3',
    'nt': 'application/n-triples',
    'otf': 'font/otf',
    'owl': 'application/rdf+xml',
    'rdf': 'application/rdf+xml',
    'pdf': 'application/pdf',
    'rss': 'application/rss+xml',
    'shex': 'text/shex',
    'shexc': 'text/shex',
    'svg': 'image/svg+xml',
    'swf': 'application/x-shockwave-flash',
    'stl': 'model/stl',
    'ttc': 'application/x-font-ttf',
    'ttf': 'application/x-font-ttf',
    'ttl': 'text/turtle',
    'vcard': 'text/vcard',
    'vcf': 'text/x-vcard',
    'vtt': 'text/vtt',
    'woff': 'application/font-woff',
    'woff2': 'application/font-woff2',
    'xhtml': 'application/xhtml+xml',
    'xht': 'application/xhtml+xml',
    'xml': 'text/xml',
    'txt': 'text/plain',
    'xsl': 'application/xml',
    'xsd': 'application/xml',
    'xslt': 'application/xslt+xml',
    'yaml': 'text/yaml',
    'yml': 'text/yaml',
    'wasm': 'application/wasm',
    'rpm': 'application/x-redhat-package-manager',
    'drpm': 'application/x-redhat-package-manager',
    'srpm': 'application/x-redhat-package-manager'
};

// 2. 对应 Nginx 的 map $extension $content_type_charset_string
const NO_CHARSET_EXTENSIONS = new Set([
    'bat', 'eot', 'htc', 'kml', 'nt', 'otf', 'pdf', 'svg', 'swf', 
    'ttc', 'ttf', 'woff', 'woff2', 'wasm', 'rpm', 'drpm', 'srpm'
]);

export default {
    async fetch(request) {
        const url = new URL(request.url);
        
        // 1. 优先拦截浏览器默认图标
        if (url.pathname === '/favicon.ico' || url.pathname.endsWith('.png') || url.pathname.endsWith('.ico')) {
            return new Response(null, { status: 404 });
        }

        const targetQueryUrl = url.searchParams.get('url');
        if (targetQueryUrl) {
            let targetPath = targetQueryUrl.replace(/^https?:\/\//i, '');
            const newProxyPath = AUTH_PREFIX + '/https://' + targetPath;
            const finalRedirectUrl = url.origin + newProxyPath;
            return Response.redirect(finalRedirectUrl, 302);
        }

        let path = url.pathname;
        const search = url.search;
        const hash = url.hash;

        // 2. 核心身份验证与路由提取
        const cleanPrefix = AUTH_PREFIX.replace(/^\/+|\/+$/g, '');
        let isStaticMode = false;

        // 检查是否符合鉴权根路径
        if (path === '/' + cleanPrefix || path === '/' + cleanPrefix + '/') {
            path = '/';
        } else if (path.startsWith('/' + cleanPrefix + '/')) {
            // 去除鉴权前缀
            let subPath = path.substring(cleanPrefix.length + 1); 
            
            // 判定并处理 /static/ 模式
            if (subPath.startsWith(STATIC_PATH_PART)) {
                isStaticMode = true;
                path = subPath.substring(STATIC_PATH_PART.length - 1); // 规整为 /https/...
            } else {
                path = subPath; // 保持普通的 /https/...
            }
        } else {
            // 未授权访问，直接引发运行时引用错误崩溃
            return trigger_real_cloudflare_1101_error_by_undefined_variable;
        }
        
        // 3. 渲染主页帮助文档
        if (path === '/' && search === '') {
            const prefixNormal = `${url.origin}${AUTH_PREFIX.replace(/\/$/, '')}`; 
            const prefixStatic = `${url.origin}${AUTH_PREFIX.replace(/\/$/, '')}/static`; 
            const targetUrl = 'https://github.com/2dust/v2rayN';
            
            if (request.method === 'HEAD') {
                return new Response(null, {
                    status: 200,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
                });
            }

            const dynamicHelpText = `<!DOCTYPE html><html><head><title>Proxy Usage</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:sans-serif;padding:20px;line-height:1.6}h3{font-weight:400}#proxy-form{display:flex;margin-top:20px;max-width:500px}#url-input{flex-grow:1;padding:10px;font-size:16px;border:1px solid #ccc;border-radius:4px 0 0 4px}#go-button{padding:10px 15px;font-size:16px;background-color:#0288d1;color:white;border:none;border-radius:0 4px 4px 0;cursor:pointer}</style></head><body><h3>Please enter the target domain name.</h3><p>普通模式 (RAW 原始下载): <br><a href="${prefixNormal}/${targetUrl}">${prefixNormal}/${targetUrl}</a></p><p>静态内容增强模式 (修正标头渲染): <br><a href="${prefixStatic}/${targetUrl}">${prefixStatic}/${targetUrl}</a></p><form id="proxy-form" action=""><input type="text" id="url-input" name="url" placeholder="在这里输入你要去的域名, 然后点 Go! 按钮" required /><button type="submit" id="go-button">Go!</button></form></body></html>`;
            
            return new Response(dynamicHelpText, { 
                status: 200, 
                headers: { 'Content-Type': 'text/html; charset=utf-8' } 
            });
        }        
        
        if (path.startsWith("/https://") || path.startsWith("/http://")) {
            let fixedPath = path.replace(/:\/\//, "/"); 
            // 重定向时注意保持当前的静态或普通模式状态
            const currentPrefix = isStaticMode ? `${AUTH_PREFIX}/static` : AUTH_PREFIX;
            const newUrl = url.origin + currentPrefix + fixedPath + search + hash;
            return Response.redirect(newUrl, 302);
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
                // 动态计算 Referer 提取的起始索引
                let startIndex = AUTH_PREFIX ? AUTH_PREFIX.split('/').length - 1 : 0;
                if (refererUrl.pathname.includes(STATIC_PATH_PART)) {
                    startIndex += 1; // 跨过 'static' 这一层级路径
                }
                
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

        // 处理 3xx 重定向响应
        if (
            upstream.status >= 300 &&
            upstream.status < 400 &&
            upstream.headers.get("Location")
        ) {
            const loc = new URL(upstream.headers.get("Location"), target).href;
            const currentPrefix = isStaticMode ? `${AUTH_PREFIX}/static` : AUTH_PREFIX;
            const pathSegment = currentPrefix + "/" + target.protocol.slice(0, -1) + "/";
            const newLocWithoutOrigin = loc.replace(/^https?:\/\//i, pathSegment.slice(1));
            const finalRedirectUrl = url.origin + "/" + newLocWithoutOrigin;
            return Response.redirect(finalRedirectUrl, 302);
        }

        const respHeaders = new Headers(upstream.headers);
        
        // 移除安全防御以及引发浏览器下载的无用标头
        ["content-security-policy", "permissions-policy", "cross-origin-embedder-policy", "cross-origin-resource-policy", "x-frame-options", "content-disposition", "x-content-type-options"].forEach(h => {
            respHeaders.delete(h);
            respHeaders.delete(h + "-report-only");
        });

        respHeaders.set("access-control-allow-origin", "*");

        // --- 核心逻辑：静态内容增强模式 ---
        if (isStaticMode) {
            // 从 URL 的 pathname 中提取扩展名
            const pathSegments = target.pathname.split('/');
            const lastSegment = pathSegments[pathSegments.length - 1] || "";
            const extMatch = lastSegment.match(/\.([a-zA-Z0-9]+)$/);
            const extension = extMatch ? extMatch[1].toLowerCase() : "";

            // 如果匹配到白名单中的静态文件后缀
            if (MIME_MAP.hasOwnProperty(extension)) {
                const detectedMime = MIME_MAP[extension];
                const charsetStr = NO_CHARSET_EXTENSIONS.has(extension) ? "" : "; charset=utf-8";
                
                // 覆盖原始的 text/plain 标头，变更为浏览器可执行/渲染的标头
                respHeaders.set("Content-Type", `${detectedMime}${charsetStr}`);
                
                // 附加缓存状态标记（模仿 nginx 配置效果）
                respHeaders.set("X-Githack-Cache-Status", "HIT_WORKER_MODIFIED");
                // 针对静态文件配置标准的强缓存（CDN 规则：1年长期缓存）
                if (upstream.status >= 200 && upstream.status < 300) {
                    respHeaders.set("Cache-Control", "max-age=31536000, public, immutable");
                }
            } else {
                // 不在白名单内的后缀：回退保持原样下载
                respHeaders.set("Cache-Control", "max-age=86400, public");
            }
        } else {
            // 普通反代模式：原 HTML 注入替换逻辑
            const ct = upstream.headers.get("content-type") || "";
            if (ct.includes("text/html")) {
                let html = await upstream.text();
                const simplePrefix = AUTH_PREFIX + "/" + target.protocol.slice(0, -1) + "/" + target.hostname;

                html = html.replace(
                    /\b(href|src|action|data-url|data-pjax|data-turbo-frame)=["'](\/(?!\/))/gi,
                    `$1="${simplePrefix}$2"`.replace('""', '"')
                );

                const targetOriginEscaped = target.origin.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const targetOriginRegex = new RegExp(targetOriginEscaped, 'gi');
                html = html.replace(targetOriginRegex, simplePrefix);

                if (target.hostname.includes('github.com')) {
                    const jsFixScript = `<script>(function(){const prefix="${simplePrefix}";const pathStart=window.location.pathname.substring(prefix.length).split('/').slice(0,3).join('/');function fixUrl(urlString){if(typeof urlString==='string'&&!urlString.startsWith(prefix)){if(urlString.startsWith(pathStart)&&pathStart.length>2){return prefix+urlString;}else if(urlString.startsWith('/_')){return prefix+urlString;}}return urlString;}const originalFetch=window.fetch;window.fetch=function(input,init){if(typeof input==='string'){input=fixUrl(input);}return originalFetch(input,init);};const originalXhrOpen=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url,...rest){url=fixUrl(url);originalXhrOpen.call(this,method,url,...rest);};})();</script>`;
                    html = html.replace('</head>', jsFixScript + '</head>');
                }

                return new Response(html, {
                    status: upstream.status,
                    headers: respHeaders
                });
            }
        }

        return new Response(upstream.body, {
            status: upstream.status,
            headers: respHeaders
        });
    }
};