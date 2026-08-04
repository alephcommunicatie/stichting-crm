"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Organization, ORGANIZATION_TYPE_LABELS, OrganizationType } from "@/lib/types";

export default function OrganizationFormModal({
  open,
  onClose,
  onSaved,
  organization,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  organization?: Organization | null;
}) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "overig" as OrganizationType,
    website: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    postal_code: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    if (organization) {
      setForm({
        name: organization.name,
        type: organization.type,
        website: organization.website || "",
        phone: organization.phone || "",
        email: organization.email || "",
        address: organization.address || "",
        city: organization.city || "",
        postal_code: organization.postal_code || "",
        notes: organization.notes || "",
      });
    } else {
      setForm({
        name: "",
        type: "overig",
        website: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        postal_code: "",
        notes: "",
      });
    }
    setError(null);
  }, [open, organization]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      ...form,
      website: form.website || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      city: form.city || null,
      postal_code: form.postal_code || null,
      notes: form.notes || null,
      created_by: user?.id || null,
    };

    const { error } = organization
      ? await supabase.from("organizations").update(payload).eq("id", organization.id)
      : await supabase.from("organizations").insert(payload);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={organization ? "Organisatie bewerken" : "Nieuwe organisatie"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Naam *</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as OrganizationType })}
            >
              {Object.entries(ORGANIZATION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
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
          <label className="label">Website</label>
          <input
            className="input"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://"
          />
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

        <div>
          <label className="label">Plaats</label>
          <input
            className="input"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
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
