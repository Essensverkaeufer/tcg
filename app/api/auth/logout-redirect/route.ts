import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site-url";

export async function GET(request: Request) {
  const redirectTo = getSiteUrl("/auth/login", request);
  const response = NextResponse.redirect(redirectTo);
  response.cookies.delete("friend_tcg_access_token");
  response.cookies.delete("friend_tcg_refresh_token");
  return response;
}
