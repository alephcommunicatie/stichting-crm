"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Task, TASK_PRIORITY_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import TaskFormModal from "@/components/tasks/TaskFormModal";
import { Plus } from "lucide-react";

const PRIORITY_COLOR: Record<string, string> = {
  laag: "text-muted",
  normaal: "text-foreground",
  hoog: "text-danger",
};

export default function RelatedTasks({
  contactId,
  organizationId,
}: {
  contactId?: string;
  organizationId?: string;
}) {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    let query = supabase.from("tasks").select("*").order("due_date", { ascending: true });
    if (contactId) query = query.eq("contact_id", contactId);
    if (organizationId) query = query.eq("organization_id", organizationId);
    const { data } = await query;
    setTasks((data as Task[]) || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, organizationId]);

  async function toggleDone(task: Task) {
    await supabase
      .from("tasks")
      .update({
        status: task.status === "done" ? "open" : "done",
        completed_at: task.status === "done" ? null : new Date().toISOString(),
      })
      .eq("id", task.id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Taken</h3>
        <button className="btn-secondary flex items-center gap-1 text-xs py-1.5" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Taak
        </button>
      </div>
      {tasks.length === 0 && <p className="text-sm text-muted py-2">Geen taken.</p>}
      <ul className="space-y-2">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-start gap-2 card p-3">
            <input
              type="checkbox"
              checked={t.status === "done"}
              onChange={() => toggleDone(t)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${t.status === "done" ? "line-through text-muted" : ""}`}>{t.title}</p>
              <p className="text-xs text-muted">
                {t.due_date ? formatDate(t.due_date) : "Geen deadline"} ·{" "}
                <span className={PRIORITY_COLOR[t.priority]}>{TASK_PRIORITY_LABELS[t.priority]}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>

      <TaskFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        defaultContactId={contactId}
        defaultOrganizationId={organizationId}
      />
    </div>
  );
}
