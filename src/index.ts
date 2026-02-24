export default {
  async fetch(request) {
    const url = new URL(request.url);
    // Get the target site from the 'url' query parameter
    let targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response("Usage: ?url=https://example.com", { status: 400 });
    }

    // Ensure the URL is valid
    if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;

    // 1. Fetch the actual website
    const originalResponse = await fetch(targetUrl, {
      headers: request.headers
    });

    // 2. Create a new response so we can modify the headers
    let newResponse = new Response(originalResponse.body, originalResponse);

    // 3. REMOVE THE BLOCKING HEADERS
    newResponse.headers.delete("X-Frame-Options");
    newResponse.headers.delete("Content-Security-Policy");
    
    // 4. ADD CORS HEADERS (So your browser doesn't block the request)
    newResponse.headers.set("Access-Control-Allow-Origin", "*");
    newResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    return newResponse;
  }
};

