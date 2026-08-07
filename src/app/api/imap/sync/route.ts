import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptSecret, listRecentMessages } from "@/lib/imap";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { data: account } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "imap")
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "Geen mailserver gekoppeld" }, { status: 400 });
  }
  if (!account.imap_host || !account.imap_port || !account.imap_password_encrypted) {
    return NextResponse.json({ error: "Mailserver-koppeling is onvolledig. Koppel opnieuw." }, { status: 400 });
  }

  try {
    const password = decryptSecret(account.imap_password_encrypted as string);
    const messages = await listRecentMessages(
      {
        host: account.imap_host as string,
        port: account.imap_port as number,
        secure: (account.imap_secure as boolean) ?? true,
        username: (account.imap_username as string | null) || (account.email_address as string),
        password,
      },
      20
    );

    const [{ data: contacts }, { data: organizations }] = await Promise.all([
      supabase.from("contacts").select("id, email"),
      supabase.from("organizations").select("id, email"),
    ]);

    const contactByEmail = new Map<string, string>(
      ((contacts as { id: string; email: string | null }[]) || [])
        .filter((c) => c.email)
        .map((c) => [c.email!.toLowerCase(), c.id])
    );
    const orgByEmail = new Map<string, string>(
      ((organizations as { id: string; email: string | null }[]) || [])
        .filter((o) => o.email)
        .map((o) => [o.email!.toLowerCase(), o.id])
    );

    let synced = 0;
    for (const m of messages) {
      const fromEmail = m.fromEmail?.toLowerCase() || null;
      const contactId = fromEmail ? contactByEmail.get(fromEmail) || null : null;
      const organizationId = fromEmail ? orgByEmail.get(fromEmail) || null : null;

      const { error } = await supabase.from("synced_emails").upsert(
        {
          account_id: account.id as string,
          provider_message_id: m.id,
          thread_id: m.threadId,
          subject: m.subject,
          snippet: m.snippet,
          from_email: m.fromEmail,
          from_name: m.fromName,
          to_emails: m.toEmails,
          received_at: m.receivedAt,
          contact_id: contactId,
          organization_id: organizationId,
        },
        { onConflict: "account_id,provider_message_id" }
      );
      if (!error) synced++;
    }

    return NextResponse.json({ synced, total: messages.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Synchroniseren mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
