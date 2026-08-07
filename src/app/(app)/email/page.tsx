"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import DealFormModal from "@/components/deals/DealFormModal";
import { EmailAccount, SyncedEmail } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Mail, RefreshCw, Link2, CheckCircle2 } from "lucide-react";

export default function EmailPage() {
  const supabase = createClient();
  const [account, setAccount] = useState<EmailAccount | null>(null);
  const [emails, setEmails] = useState<SyncedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [convertingEmail, setConvertingEmail] = useState<SyncedEmail | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUrlError(params.get("error"));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: accountData } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("provider", "gmail")
      .eq("user_id", user?.id || "")
      .maybeSingle();
    setAccount(accountData as EmailAccount | null);

    const { data: emailsData } = await supabase
      .from("synced_emails")
      .select("*, contacts(*), organizations(*)")
      .order("received_at", { ascending: false })
      .limit(50);
    setEmails((emailsData as SyncedEmail[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Synchroniseren mislukt");
      await load();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Synchroniseren mislukt");
    } finally {
      setSyncing(false);
    }
  }

  async function handleConverted() {
    if (!convertingEmail) {
      setConvertingEmail(null);
      return;
    }
    let query = supabase.from("deals").select("*").order("created_at", { ascending: false }).limit(1);
    if (convertingEmail.contact_id) {
      query = query.eq("contact_id", convertingEmail.contact_id);
    } else if (convertingEmail.organization_id) {
      query = query.eq("organization_id", convertingEmail.organization_id);
    }
    const { data } = await query.maybeSingle();
    if (data) {
      await supabase
        .from("synced_emails")
        .update({ converted_deal_id: (data as { id: string }).id })
        .eq("id", convertingEmail.id);
    }
    setConvertingEmail(null);
    load();
  }

  return (
    <div>
      <PageHeader
        title="E-mail"
        description={account ? `Gekoppeld: ${account.email_address}` : "Nog geen mailbox gekoppeld"}
        action={
          account ? (
            <button className="btn-secondary flex items-center gap-1.5" onClick={handleSync} disabled={syncing}>
              <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Synchroniseren..." : "Sync nu"}
            </button>
          ) : (
            <a href="/api/auth/gmail/start" className="btn-primary flex items-center gap-1.5">
              <Link2 size={15} /> Gmail koppelen
            </a>
          )
        }
      />

      <div className="px-4 sm:px-8 py-6 space-y-4">
        {urlError && (
          <div className="card p-3 text-sm text-danger">Koppelen mislukt: {urlError}</div>
        )}
        {syncError && <div className="card p-3 text-sm text-danger">{syncError}</div>}

        {!account && !loading && (
          <div className="card p-8 text-center">
            <Mail size={28} className="mx-auto text-muted mb-3" />
            <p className="text-sm font-medium mb-1">Nog geen mailbox gekoppeld</p>
            <p className="text-sm text-muted mb-4 max-w-md mx-auto">
              Koppel je Gmail-account om binnenkomende e-mails te zien en met één klik om te zetten naar een kans op
              de pipeline.
            </p>
            <a href="/api/auth/gmail/start" className="btn-primary inline-flex items-center gap-1.5">
              <Link2 size={15} /> Gmail koppelen
            </a>
          </div>
        )}

        {account && (
          <div className="card overflow-hidden">
            {!loading && emails.length === 0 && (
              <p className="text-sm text-muted text-center py-10">
                Nog geen e-mails gesynchroniseerd. Klik op &quot;Sync nu&quot;.
              </p>
            )}
            <ul>
              {emails.map((email) => (
                <li key={email.id} className="px-5 py-4 border-b border-border last:border-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{email.subject || "(geen onderwerp)"}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {email.from_name || email.from_email} · {formatDateTime(email.received_at)}
                      </p>
                      {email.snippet && (
                        <p className="text-sm text-muted mt-1.5 line-clamp-2">{email.snippet}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {email.contacts ? (
                          <Link href={`/contacts/${email.contact_id}`}>
                            <Badge color="#16a34a">Gekoppeld aan contact</Badge>
                          </Link>
                        ) : email.organizations ? (
                          <Link href={`/organizations/${email.organization_id}`}>
                            <Badge color="#2563eb">Gekoppeld aan organisatie</Badge>
                          </Link>
                        ) : (
                          <Badge color="#94a3b8">Geen match</Badge>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {email.converted_deal_id ? (
                        <Link href="/pipeline" className="text-xs text-success flex items-center gap-1">
                          <CheckCircle2 size={14} /> Omgezet naar kans
                        </Link>
                      ) : (
                        <button className="btn-secondary text-xs py-1.5" onClick={() => setConvertingEmail(email)}>
                          Zet om naar kans
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <DealFormModal
        open={!!convertingEmail}
        onClose={() => setConvertingEmail(null)}
        onSaved={handleConverted}
        defaultContactId={convertingEmail?.contact_id}
        defaultOrganizationId={convertingEmail?.organization_id}
        initialTitle={convertingEmail?.subject || undefined}
      />
    </div>
  );
}
