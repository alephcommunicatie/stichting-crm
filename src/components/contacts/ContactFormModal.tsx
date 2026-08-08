"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useActiveOrg } from "@/components/OrgProvider";
import Modal from "@/components/ui/Modal";
import { Contact, RELATION_TYPE_LABELS, RelationType } from "@/lib/types";

export default function ContactFormModal({
  open,
  onClose,
  onSaved,
  contact,
  defaultOrganizationId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  contact?: Contact | null;
  defaultOrganizationId?: string | null;
}) {
  const supabase = createClient();
  const { writeOrgId } = useActiveOrg();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    organization_id: "",
    relation_type: "overig" as RelationType,
    status: "actief",
    address: "",
    city: "",
    postal_code: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;

    if (contact) {
      setForm({
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        email: contact.email || "",
        phone: contact.phone || "",
        organization_id: contact.organization_id || "",
        relation_type: contact.relation_type,
        status: contact.status,
        address: contact.address || "",
        city: contact.city || "",
        postal_code: contact.postal_code || "",
        notes: contact.notes || "",
      });
    } else {
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        organization_id: defaultOrganizationId || writeOrgId,
        relation_type: "overig",
        status: "actief",
        address: "",
        city: "",
        postal_code: "",
        notes: "",
      });
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contact]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      organization_id: form.organization_id || writeOrgId,
      last_name: form.last_name || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      city: form.city || null,
      postal_code: form.postal_code || null,
      notes: form.notes || null,
    };

    const { error } = contact
      ? await supabase.from("contacts").update(payload).eq("id", contact.id)
      : await supabase.from("contacts").insert(payload);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={contact ? "Contact bewerken" : "Nieuw contact"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Voornaam *</label>
            <input
              className="input"
              required
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Achternaam</label>
            <input
              className="input"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">E-mail</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Telefoon</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Type relatie</label>
          <select
            className="input"
            value={form.relation_type}
            onChange={(e) => setForm({ ...form, relation_type: e.target.value as RelationType })}
          >
            {Object.entries(RELATION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="label">Adres</label>
            <input
              className="input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Postcode</label>
            <input
              className="input"
              value={form.postal_code}
              onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Plaats</label>
            <input
              className="input"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="actief">Actief</option>
              <option value="inactief">Inactief</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Notities</label>
          <textarea
            className="input"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuleren
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Opslaan..." : "Opslaan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
