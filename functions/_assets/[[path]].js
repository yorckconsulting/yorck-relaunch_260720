export function onRequest() {
  return new Response("Gone", {
    status: 410,
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      "Content-Type": "text/plain; charset=utf-8",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      "Referrer-Policy": "no-referrer",
      "Strict-Transport-Security": "max-age=31536000",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-Robots-Tag": "noindex"
    }
  });
}
