"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useActiveOrg } from "@/components/OrgProvider";
import Modal from "@/components/ui/Modal";
import { Task, TaskPriority, TASK_PRIORITY_LABELS } from "@/lib/types";

export default function TaskFormModal({
  open,
  onClose,
  onSaved,
  task,
  defaultContactId,
  defaultOrganizationId,
  defaultDealId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  task?: Task | null;
  defaultContactId?: string | null;
  defaultOrganizationId?: string | null;
  defaultDealId?: string | null;
}) {
  const supabase = createClient();
  const { activeOrgId } = useActiveOrg();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "normaal" as TaskPriority,
  });

  useEffect(() => {
    if (!open) return;
    if (task) {
      setForm({
        title: task.title,
        description: task.description || "",
        due_date: task.due_date ? task.due_date.slice(0, 10) : "",
        priority: task.priority,
      });
    } else {
      setForm({ title: "", description: "", due_date: "", priority: "normaal" });
    }
    setError(null);
  }, [open, task]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      title: form.title,
      description: form.description || null,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      priority: form.priority,
      contact_id: task?.contact_id ?? defaultContactId ?? null,
      organization_id: task?.organization_id ?? defaultOrganizationId ?? activeOrgId,
      deal_id: task?.deal_id ?? defaultDealId ?? null,
      created_by: user?.id || null,
    };

    const { error } = task
      ? await supabase.from("tasks").update(payload).eq("id", task.id)
      : await supabase.from("tasks").insert({ ...payload, status: "open" });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={task ? "Taak bewerken" : "Nieuwe taak"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Titel *</label>
          <input
            className="input"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Omschrijving</label>
          <textarea
            className="input"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Deadline</label>
            <input
              className="input"
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Prioriteit</label>
            <select
              className="input"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
            >
              {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
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
