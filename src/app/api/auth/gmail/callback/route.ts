import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, fetchGoogleUserEmail } from "@/lib/gmail";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (oauthError || !code) {
    return NextResponse.redirect(
      new URL(`/email?error=${encodeURIComponent(oauthError || "Geen autorisatiecode ontvangen")}`, request.url)
    );
  }

  try {
    const redirectUri = new URL("/api/auth/gmail/callback", request.url).toString();
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const emailAddress = await fetchGoogleUserEmail(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const payload: Record<string, unknown> = {
      user_id: user.id,
      provider: "gmail",
      email_address: emailAddress,
      access_token: tokens.access_token,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };
    // Google only sends a refresh_token on first consent (or when prompt=consent
    // forces re-consent). Only overwrite it when we actually received one, so a
    // reconnect never wipes out an existing valid refresh_token.
    if (tokens.refresh_token) payload.refresh_token = tokens.refresh_token;

    const { error } = await supabase
      .from("email_accounts")
      .upsert(payload, { onConflict: "user_id,provider,email_address" });
    if (error) throw new Error(error.message);

    return NextResponse.redirect(new URL("/email?connected=1", request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.redirect(new URL(`/email?error=${encodeURIComponent(message)}`, request.url));
  }
}
