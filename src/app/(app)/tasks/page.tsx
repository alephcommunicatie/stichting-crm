"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import TaskFormModal from "@/components/tasks/TaskFormModal";
import { Task, TASK_PRIORITY_LABELS } from "@/lib/types";
import { formatDate, fullName } from "@/lib/utils";
import { Plus } from "lucide-react";

const PRIORITY_COLOR: Record<string, string> = {
  laag: "#94a3b8",
  normaal: "#2563eb",
  hoog: "#dc2626",
};

type Filter = "open" | "done" | "all" | "overdue";

export default function TasksPage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("open");
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*, contacts(*), organizations(*)")
      .order("due_date", { ascending: true, nullsFirst: false });
    setTasks((data as Task[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleDone(task: Task) {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: t.status === "done" ? "open" : "done" } : t))
    );
    await supabase
      .from("tasks")
      .update({
        status: task.status === "done" ? "open" : "done",
        completed_at: task.status === "done" ? null : new Date().toISOString(),
      })
      .eq("id", task.id);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === "open") return t.status === "open";
      if (filter === "done") return t.status === "done";
      if (filter === "overdue") return t.status === "open" && t.due_date && new Date(t.due_date) < today;
      return true;
    });
  }, [tasks, filter]);

  return (
    <div>
      <PageHeader
        title="Taken"
        description={`${tasks.filter((t) => t.status === "open").length} open taken`}
        action={
          <button className="btn-primary flex items-center gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Nieuwe taak
          </button>
        }
      />

      <div className="px-4 sm:px-8 py-5">
        <div className="flex gap-2 mb-4">
          {(["open", "overdue", "done", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                filter === f ? "bg-primary text-white" : "bg-white border border-border text-muted"
              }`}
            >
              {f === "open" ? "Open" : f === "done" ? "Afgerond" : f === "overdue" ? "Verlopen" : "Alle"}
            </button>
          ))}
        </div>

        <div className="card overflow-x-auto">
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted text-center py-10">Geen taken gevonden.</p>
          )}
          <ul>
            {filtered.map((t) => {
              const overdue = t.status === "open" && t.due_date && new Date(t.due_date) < today;
              return (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0 hover:bg-gray-50">
                  <input type="checkbox" checked={t.status === "done"} onChange={() => toggleDone(t)} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${t.status === "done" ? "line-through text-muted" : ""}`}>{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
                      {t.due_date && <span className={overdue ? "text-danger font-medium" : ""}>{formatDate(t.due_date)}</span>}
                      {t.contacts && (
                        <Link href={`/contacts/${t.contact_id}`} className="hover:text-primary">
                          {fullName(t.contacts)}
                        </Link>
                      )}
                      {t.organizations && (
                        <Link href={`/organizations/${t.organization_id}`} className="hover:text-primary">
                          {t.organizations.name}
                        </Link>
                      )}
                    </div>
                  </div>
                  <Badge color={PRIORITY_COLOR[t.priority]}>{TASK_PRIORITY_LABELS[t.priority]}</Badge>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <TaskFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} />
    </div>
  );
}
