"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { INTERACTION_TYPE_LABELS, Interaction, InteractionType } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Mail, Phone, Calendar, StickyNote, PartyPopper, Gift, Plus } from "lucide-react";

const ICONS: Record<InteractionType, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: StickyNote,
  event: PartyPopper,
  gift: Gift,
};

export default function InteractionTimeline({
  contactId,
  organizationId,
}: {
  contactId?: string;
  organizationId?: string;
}) {
  const supabase = createClient();
  const [items, setItems] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "note" as InteractionType,
    subject: "",
    description: "",
  });

  async function load() {
    setLoading(true);
    let query = supabase.from("interactions").select("*").order("interaction_date", { ascending: false });
    if (contactId) query = query.eq("contact_id", contactId);
    if (organizationId) query = query.eq("organization_id", organizationId);
    const { data } = await query;
    setItems((data as Interaction[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, organizationId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("interactions").insert({
      contact_id: contactId || null,
      organization_id: organizationId || null,
      type: form.type,
      subject: form.subject || null,
      description: form.description || null,
      created_by: user?.id || null,
    });
    setSaving(false);
    setForm({ type: "note", subject: "", description: "" });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Contactmomenten</h3>
        <button className="btn-secondary flex items-center gap-1 text-xs py-1.5" onClick={() => setShowForm((s) => !s)}>
          <Plus size={14} /> Toevoegen
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="card p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as InteractionType })}
            >
              {Object.entries(INTERACTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Onderwerp"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>
          <textarea
            className="input"
            rows={2}
            placeholder="Beschrijving..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary text-xs py-1.5" onClick={() => setShowForm(false)}>
              Annuleren
            </button>
            <button type="submit" className="btn-primary text-xs py-1.5" disabled={saving}>
              {saving ? "Opslaan..." : "Opslaan"}
            </button>
          </div>
        </form>
      )}

      {!loading && items.length === 0 && (
        <p className="text-sm text-muted py-4">Nog geen contactmomenten geregistreerd.</p>
      )}

      <div className="space-y-4">
        {items.map((item) => {
          const Icon = ICONS[item.type] || StickyNote;
          return (
            <div key={item.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0">
                <Icon size={14} />
              </div>
              <div className="flex-1 min-w-0 pb-4 border-b border-border last:border-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {item.subject || INTERACTION_TYPE_LABELS[item.type]}
                  </p>
                  <span className="text-xs text-muted">{formatDateTime(item.interaction_date)}</span>
                </div>
                {item.description && (
                  <p className="text-sm text-muted mt-1 whitespace-pre-wrap">{item.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
