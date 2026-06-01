import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("friend_tcg_access_token");
  response.cookies.delete("friend_tcg_refresh_token");
  return response;
}
