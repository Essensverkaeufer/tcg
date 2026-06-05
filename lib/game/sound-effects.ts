export function resolveSoundEffectUrl(soundEffectUrl?: string | null) {
  if (!soundEffectUrl) return "";
  if (/^(https?:|data:|blob:)/.test(soundEffectUrl)) return soundEffectUrl;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return soundEffectUrl;

  if (soundEffectUrl.startsWith("/card-art/")) {
    const objectPath = soundEffectUrl.replace(/^\/card-art\//, "");
    return `${supabaseUrl}/storage/v1/object/public/card-art/${objectPath}`;
  }

  if (soundEffectUrl.startsWith("card-art/")) {
    const objectPath = soundEffectUrl.replace(/^card-art\//, "");
    return `${supabaseUrl}/storage/v1/object/public/card-art/${objectPath}`;
  }

  return soundEffectUrl;
}
