export function resolveCardImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return "";
  if (/^(https?:|data:|blob:)/.test(imageUrl)) return imageUrl;

  if (imageUrl.startsWith("/card-art/")) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const objectPath = imageUrl.replace(/^\/card-art\//, "");
    if (!supabaseUrl) return imageUrl;
    return `${supabaseUrl}/storage/v1/object/public/card-art/${objectPath}`;
  }

  return imageUrl;
}
