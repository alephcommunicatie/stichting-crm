import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleAuthUrl } from "@/lib/gmail";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(
      new URL("/email?error=" + encodeURIComponent("GOOGLE_CLIENT_ID is niet geconfigureerd op de server."), request.url)
    );
  }

  const redirectUri = new URL("/api/auth/gmail/callback", request.url).toString();
  return NextResponse.redirect(buildGoogleAuthUrl(redirectUri));
}
