export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    // 1. Show the "Browser" UI if no URL is requested
    if (!targetUrl) {
      return new Response(renderBrowserUI(url.origin), {
        headers: { "content-type": "text/html;charset=UTF-8" },
      });
    }

    // 2. Fetch the target site and strip security headers
    try {
      const response = await fetch(targetUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      // Clone response to modify headers
      let newHeaders = new Headers(response.headers);
      
      // STRIP IFRAME OPTIONS: Allow the site to be framed
      newHeaders.delete("X-Frame-Options");
      newHeaders.delete("Content-Security-Policy"); 
      
      // CSS FIX: Ensure cross-origin assets can load
      newHeaders.set("Access-Control-Allow-Origin", "*");

      // Use HTMLRewriter to fix relative paths (CSS, JS, Images)
      const rewriter = new HTMLRewriter()
        .on("link", new AttributeRewriter("href", targetUrl, url.origin))
        .on("script", new AttributeRewriter("src", targetUrl, url.origin))
        .on("img", new AttributeRewriter("src", targetUrl, url.origin))
        .on("a", new AttributeRewriter("href", targetUrl, url.origin));

      const proxiedResponse = new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });

      return rewriter.transform(proxiedResponse);
    } catch (e) {
      return new Response(`Error: ${e.message}`, { status: 500 });
    }
  },
};

// Logic to rewrite relative URLs so CSS/JS load through your proxy
class AttributeRewriter {
  constructor(attrName, targetUrl, workerOrigin) {
    this.attrName = attrName;
    this.targetBase = new URL(targetUrl).origin;
    this.workerOrigin = workerOrigin;
  }
  element(element) {
    const attr = element.getAttribute(this.attrName);
    if (attr && !attr.startsWith("http") && !attr.startsWith("data:")) {
      const absolute = new URL(attr, this.targetBase).href;
      element.setAttribute(this.attrName, `${this.workerOrigin}/?url=${encodeURIComponent(absolute)}`);
    }
  }
}

// The HTML interface for your "Browser"
function renderBrowserUI(origin) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Edge Proxy Browser</title>
      <style>
        body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; font-family: sans-serif; background: #1a1a1a; }
        .nav { height: 50px; background: #333; display: flex; align-items: center; padding: 0 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.5); }
        input { flex-grow: 1; margin: 0 10px; padding: 8px; border-radius: 4px; border: none; }
        button { padding: 8px 15px; cursor: pointer; background: #0070f3; color: white; border: none; border-radius: 4px; }
        iframe { width: 100%; height: calc(100% - 50px); border: none; background: white; }
      </style>
    </head>
    <body>
      <div class="nav">
        <strong style="color: white;">Browser</strong>
        <input type="text" id="urlInput" placeholder="https://example.com">
        <button onclick="browse()">Go</button>
      </div>
      <iframe id="viewport" src="about:blank"></iframe>
      <script>
        function browse() {
          const target = document.getElementById('urlInput').value;
          const proxyUrl = '${origin}/?url=' + encodeURIComponent(target);
          document.getElementById('viewport').src = proxyUrl;
        }
      </script>
    </body>
    </html>
  `;
}
