import { NextResponse } from "next/server";
import { requireSupabaseUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing profile picture." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Profile picture must be an image." }, { status: 400 });
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: "Profile picture must be 5 MB or smaller." }, { status: 400 });
  }

  const bucket = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET ?? "profile-pictures";
  const extension = extensionFromFile(file);
  const path = `${auth.user.id}/avatar-${Date.now()}.${extension}`;
  const body = Buffer.from(await file.arrayBuffer());

  const upload = await auth.supabase.storage.from(bucket).upload(path, body, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 500 });
  }

  const { data } = auth.supabase.storage.from(bucket).getPublicUrl(path);

  const update = await auth.supabase
    .from("profiles")
    .update({
      avatar_path: path,
      avatar_url: data.publicUrl,
    })
    .eq("id", auth.user.id)
    .select("*")
    .single();

  if (update.error || !update.data) {
    await auth.supabase.storage.from(bucket).remove([path]).catch(() => undefined);
    return NextResponse.json({ error: update.error?.message ?? "Could not update profile picture link." }, { status: 500 });
  }

  return NextResponse.json({
    profile: update.data,
    path,
    publicUrl: data.publicUrl,
  });
}

function extensionFromFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (extension) return extension;
  const [, subtype] = file.type.split("/");
  return subtype?.replace(/[^a-z0-9]/g, "") || "webp";
}
