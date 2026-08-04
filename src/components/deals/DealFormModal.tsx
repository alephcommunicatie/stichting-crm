"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Deal, PipelineStage } from "@/lib/types";

export default function DealFormModal({
  open,
  onClose,
  onSaved,
  deal,
  defaultContactId,
  defaultOrganizationId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  deal?: Deal | null;
  defaultContactId?: string | null;
  defaultOrganizationId?: string | null;
}) {
  const supabase = createClient();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    amount: "0",
    stage_id: "",
    expected_close_date: "",
    probability: "50",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    supabase
      .from("pipeline_stages")
      .select("*")
      .order("position")
      .then(({ data }) => setStages((data as PipelineStage[]) || []));

    if (deal) {
      setForm({
        title: deal.title,
        amount: String(deal.amount),
        stage_id: deal.stage_id || "",
        expected_close_date: deal.expected_close_date || "",
        probability: String(deal.probability),
        notes: deal.notes || "",
      });
    } else {
      setForm({ title: "", amount: "0", stage_id: "", expected_close_date: "", probability: "50", notes: "" });
    }
    setError(null);
  }, [open, deal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let stageId = form.stage_id;
    if (!stageId && stages.length > 0) stageId = stages[0].id;

    const payload = {
      title: form.title,
      amount: Number(form.amount) || 0,
      stage_id: stageId || null,
      expected_close_date: form.expected_close_date || null,
      probability: Number(form.probability) || 0,
      notes: form.notes || null,
      contact_id: deal?.contact_id ?? defaultContactId ?? null,
      organization_id: deal?.organization_id ?? defaultOrganizationId ?? null,
      created_by: user?.id || null,
    };

    const { error } = deal
      ? await supabase.from("deals").update(payload).eq("id", deal.id)
      : await supabase.from("deals").insert({ ...payload, status: "open" });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={deal ? "Kans bewerken" : "Nieuwe kans"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Titel *</label>
          <input
            className="input"
            required
            placeholder="Bijv. Subsidieaanvraag gemeente 2026"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Bedrag (EUR)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Fase</label>
            <select
              className="input"
              value={form.stage_id}
              onChange={(e) => setForm({ ...form, stage_id: e.target.value })}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Verwachte einddatum</label>
            <input
              className="input"
              type="date"
              value={form.expected_close_date}
              onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Kans (%)</label>
            <input
              className="input"
              type="number"
              min="0"
              max="100"
              value={form.probability}
              onChange={(e) => setForm({ ...form, probability: e.target.value })}
            />
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
