import { NextResponse } from "next/server";
import { requireSupabaseUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireSupabaseUser(request);
  if ("error" in auth) return auth.error;

  const result = await auth.supabase.rpc("convert_duplicate_extras", {
    p_user_id: auth.user.id,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const conversion = result.data?.[0];
  return NextResponse.json({
    credits: conversion?.credits ?? 0,
    duplicateCredits: conversion?.duplicate_credits ?? 0,
    converted: conversion?.converted ?? [],
  });
}
