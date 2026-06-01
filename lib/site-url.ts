export function getSiteOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const referer = request.headers.get("referer");
  if (referer) return new URL(referer).origin;

  const url = new URL(request.url);
  return url.origin.replace("://0.0.0.0", "://localhost");
}

export function getSiteUrl(path: string, request: Request) {
  return new URL(path, getSiteOrigin(request));
}
