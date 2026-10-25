export default {
  async fetch(request) {
    const url = new URL(request.url);

    let targetPath = url.pathname.slice(1) + url.search + url.hash;
    if (!targetPath) {
      return new Response("Bad Request", { status: 400 });
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
      return Response.redirect(url.origin + "/" + loc, 302);
    }

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

    // 🔧 关键修复点：重写 HTML 相对路径
    if (ct.includes("text/html")) {
      let html = await upstream.text();
      const prefix = "/" + target.origin;

      html = html.replace(
        /\b(href|src|action)=["']\/(?!\/)/gi,
        `$1="${prefix}/`
      );

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
