"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";

function guessHostFromEmail(email: string): string {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  return domain ? `mail.${domain}` : "";
}

export default function ImapAccountModal({
  open,
  onClose,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hostTouched, setHostTouched] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState({
    email_address: "",
    password: "",
    imap_host: "",
    imap_port: "993",
    imap_secure: true,
    imap_username: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      email_address: "",
      password: "",
      imap_host: "",
      imap_port: "993",
      imap_secure: true,
      imap_username: "",
    });
    setHostTouched(false);
    setShowAdvanced(false);
    setError(null);
  }, [open]);

  function handleEmailChange(value: string) {
    setForm((f) => ({
      ...f,
      email_address: value,
      imap_host: hostTouched ? f.imap_host : guessHostFromEmail(value),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/imap/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_address: form.email_address,
          password: form.password,
          imap_host: form.imap_host,
          imap_port: Number(form.imap_port),
          imap_secure: form.imap_secure,
          imap_username: form.imap_username || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Koppelen mislukt");
      onConnected();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Koppelen mislukt");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Eigen mailserver koppelen (IMAP)">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          Voor mailboxen bij je eigen hosting (bijv. Vimexx of een andere provider) die geen Gmail of Microsoft 365
          zijn. We loggen in via IMAP — vraag bij twijfel de mailserver-instellingen op bij je hostingprovider.
        </p>

        <div>
          <label className="label">E-mailadres *</label>
          <input
            className="input"
            type="email"
            required
            placeholder="naam@jouwstichting.nl"
            value={form.email_address}
            onChange={(e) => handleEmailChange(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Wachtwoord *</label>
          <input
            className="input"
            type="password"
            required
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="label">Mailserver (IMAP-host) *</label>
            <input
              className="input"
              required
              placeholder="mail.jouwstichting.nl"
              value={form.imap_host}
              onChange={(e) => {
                setHostTouched(true);
                setForm({ ...form, imap_host: e.target.value });
              }}
            />
          </div>
          <div>
            <label className="label">Poort *</label>
            <input
              className="input"
              required
              type="number"
              value={form.imap_port}
              onChange={(e) => setForm({ ...form, imap_port: e.target.value })}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.imap_secure}
            onChange={(e) => setForm({ ...form, imap_secure: e.target.checked })}
          />
          Beveiligde verbinding (SSL/TLS) — meestal aan bij poort 993
        </label>

        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setShowAdvanced((s) => !s)}
        >
          {showAdvanced ? "Verberg geavanceerde opties" : "Geavanceerd: andere gebruikersnaam"}
        </button>

        {showAdvanced && (
          <div>
            <label className="label">Gebruikersnaam (indien niet gelijk aan e-mailadres)</label>
            <input
              className="input"
              placeholder={form.email_address || "naam@jouwstichting.nl"}
              value={form.imap_username}
              onChange={(e) => setForm({ ...form, imap_username: e.target.value })}
            />
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuleren
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Verbinden..." : "Koppelen"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
