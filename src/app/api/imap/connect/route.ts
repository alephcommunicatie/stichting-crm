import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret, testImapConnection } from "@/lib/imap";

interface ConnectBody {
  email_address?: string;
  password?: string;
  imap_host?: string;
  imap_port?: number | string;
  imap_secure?: boolean;
  imap_username?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  if (!process.env.EMAIL_ENCRYPTION_KEY) {
    return NextResponse.json(
      { error: "EMAIL_ENCRYPTION_KEY is niet geconfigureerd op de server." },
      { status: 500 }
    );
  }

  let body: ConnectBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
  }

  const emailAddress = body.email_address?.trim();
  const password = body.password;
  const imapHost = body.imap_host?.trim();
  const imapPort = Number(body.imap_port);
  const imapSecure = body.imap_secure !== false;
  const imapUsername = body.imap_username?.trim() || emailAddress;

  if (!emailAddress || !password || !imapHost || !imapPort) {
    return NextResponse.json(
      { error: "E-mailadres, wachtwoord, mailserver en poort zijn verplicht." },
      { status: 400 }
    );
  }

  try {
    await testImapConnection({
      host: imapHost,
      port: imapPort,
      secure: imapSecure,
      username: imapUsername!,
      password,
    });

    const encryptedPassword = encryptSecret(password);

    const { error } = await supabase.from("email_accounts").upsert(
      {
        user_id: user.id,
        provider: "imap",
        email_address: emailAddress,
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        imap_host: imapHost,
        imap_port: imapPort,
        imap_secure: imapSecure,
        imap_username: imapUsername === emailAddress ? null : imapUsername,
        imap_password_encrypted: encryptedPassword,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider,email_address" }
    );
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Koppelen mislukt";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
