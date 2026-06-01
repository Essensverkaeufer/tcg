import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export async function uploadProfilePicture({
  supabase,
  userId,
  file,
}: {
  supabase: SupabaseClient<Database>;
  userId: string;
  file: File;
}) {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET ?? "profile-pictures";
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "webp";
  const path = `${userId}/avatar-${Date.now()}.${extension}`;

  const upload = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (upload.error) {
    throw upload.error;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  const update = await supabase
    .from("profiles")
    .update({
      avatar_path: path,
      avatar_url: data.publicUrl,
    })
    .eq("id", userId);

  if (update.error) {
    throw update.error;
  }

  return {
    path,
    publicUrl: data.publicUrl,
  };
}
