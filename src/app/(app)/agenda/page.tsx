"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useActiveOrg } from "@/components/OrgProvider";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Task, Interaction, InteractionType, TaskPriority, TASK_PRIORITY_LABELS, INTERACTION_TYPE_LABELS } from "@/lib/types";
import { fullName } from "@/lib/utils";
import {
  CalendarClock,
  CheckSquare,
  Phone,
  Mail,
  Calendar,
  StickyNote,
  PartyPopper,
  Gift,
  ChevronLeft,
  ChevronRight,
  RefreshCcw as SyncIcon,
  Copy,
  Check,
} from "lucide-react";

const APPOINTMENT_TYPES: InteractionType[] = ["meeting", "event"];

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  laag: "#94a3b8",
  normaal: "#2563eb",
  hoog: "#dc2626",
};

const TYPE_ICONS: Record<InteractionType, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: StickyNote,
  event: PartyPopper,
  gift: Gift,
};

const TYPE_COLOR: Record<InteractionType, string> = {
  call: "#2563eb",
  email: "#0891b2",
  meeting: "#2a78d6",
  note: "#64748b",
  event: "#d97706",
  gift: "#db2777",
};

const HOUR_START = 7;
const HOUR_END = 21;
const ROW_HEIGHT = 56;

type ViewMode = "lijst" | "week" | "maand";
type ListFilter = "aankomend" | "verleden" | "alles";

interface AgendaItem {
  id: string;
  dateKey: string;
  timestamp: string;
  kind: "taak" | "afspraak";
  title: string;
  subtitleName: string | null;
  href: string | null;
  done: boolean;
  priority?: TaskPriority;
  interactionType?: InteractionType;
  hasTime: boolean;
}

function dateKeyOf(iso: string): string {
  return iso.slice(0, 10);
}

function dateKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayKey(): string {
  return dateKeyFromDate(new Date());
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // maandag = 0
  d.setDate(d.getDate() - day);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function timeToTop(iso: string): number {
  const d = new Date(iso);
  const hours = d.getHours() + d.getMinutes() / 60;
  return (Math.min(Math.max(hours, HOUR_START), HOUR_END) - HOUR_START) * ROW_HEIGHT;
}

function dateHeaderLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getTime() === today.getTime()) return "Vandaag";
  if (date.getTime() === tomorrow.getTime()) return "Morgen";
  if (date.getTime() === yesterday.getTime()) return "Gisteren";
  return new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

export default function AgendaPage() {
  const supabase = createClient();
  const { activeOrgId } = useActiveOrg();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ListFilter>("aankomend");
  const [viewMode, setViewMode] = useState<ViewMode>("lijst");
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());

  const [syncOpen, setSyncOpen] = useState(false);
  const [feedToken, setFeedToken] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function ensureFeedToken(): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: existing } = await supabase
      .from("calendar_feed_tokens")
      .select("token")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing?.token) return existing.token as string;

    const token = `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
    const { data: inserted, error } = await supabase
      .from("calendar_feed_tokens")
      .insert({ user_id: user.id, token })
      .select("token")
      .single();
    if (error || !inserted) return null;
    return inserted.token as string;
  }

  async function openSync() {
    setSyncOpen(true);
    setFeedError(null);
    if (feedToken) return;
    setFeedLoading(true);
    const token = await ensureFeedToken();
    setFeedLoading(false);
    if (!token) {
      setFeedError("Kon geen agenda-link genereren. Probeer het opnieuw.");
      return;
    }
    setFeedToken(token);
  }

  async function handleRegenerate() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setFeedLoading(true);
    setFeedError(null);
    const newToken = `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
    const { error } = await supabase
      .from("calendar_feed_tokens")
      .update({ token: newToken, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    setFeedLoading(false);
    if (error) {
      setFeedError("Vernieuwen van de link is mislukt.");
      return;
    }
    setFeedToken(newToken);
    setCopied(false);
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function load() {
    setLoading(true);
    const [{ data: tasksData }, { data: interactionsData }] = await Promise.all([
      supabase
        .from("tasks")
        .select("*, contacts(*), organizations(*)")
        .eq("organization_id", activeOrgId)
        .not("due_date", "is", null)
        .order("due_date", { ascending: true }),
      supabase
        .from("interactions")
        .select("*, contacts(*), organizations(*)")
        .eq("organization_id", activeOrgId)
        .in("type", APPOINTMENT_TYPES)
        .order("interaction_date", { ascending: true }),
    ]);
    setTasks((tasksData as Task[]) || []);
    setInteractions((interactionsData as Interaction[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId]);

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

  const items = useMemo<AgendaItem[]>(() => {
    const taskItems: AgendaItem[] = tasks.map((t) => ({
      id: `task-${t.id}`,
      dateKey: dateKeyOf(t.due_date as string),
      timestamp: t.due_date as string,
      kind: "taak",
      title: t.title,
      subtitleName: t.contacts ? fullName(t.contacts) : t.organizations?.name || null,
      href: t.contact_id ? `/contacts/${t.contact_id}` : t.organization_id ? `/organizations/${t.organization_id}` : null,
      done: t.status === "done",
      priority: t.priority,
      hasTime: false,
    }));
    const appointmentItems: AgendaItem[] = interactions.map((i) => ({
      id: `interaction-${i.id}`,
      dateKey: dateKeyOf(i.interaction_date),
      timestamp: i.interaction_date,
      kind: "afspraak",
      title: i.subject || INTERACTION_TYPE_LABELS[i.type],
      subtitleName: i.contacts ? fullName(i.contacts) : i.organizations?.name || null,
      href: i.contact_id ? `/contacts/${i.contact_id}` : i.organization_id ? `/organizations/${i.organization_id}` : null,
      done: false,
      interactionType: i.type,
      hasTime: true,
    }));
    return [...taskItems, ...appointmentItems].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }, [tasks, interactions]);

  const filtered = useMemo(() => {
    const today = todayKey();
    return items.filter((item) => {
      if (filter === "aankomend") return !(item.dateKey < today || (item.kind === "taak" && item.done));
      if (filter === "verleden") return item.dateKey < today;
      return true;
    });
  }, [items, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const item of filtered) {
      if (!map.has(item.dateKey)) map.set(item.dateKey, []);
      map.get(item.dateKey)!.push(item);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const itemsByDateKey = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const item of items) {
      if (!map.has(item.dateKey)) map.set(item.dateKey, []);
      map.get(item.dateKey)!.push(item);
    }
    return map;
  }, [items]);

  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const monthGridStart = useMemo(() => startOfWeek(startOfMonth(anchorDate)), [anchorDate]);
  const monthDays = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(monthGridStart, i)), [monthGridStart]);

  function goPrev() {
    setAnchorDate((d) => (viewMode === "week" ? addDays(d, -7) : addMonths(startOfMonth(d), -1)));
  }
  function goNext() {
    setAnchorDate((d) => (viewMode === "week" ? addDays(d, 7) : addMonths(startOfMonth(d), 1)));
  }

  const rangeLabel =
    viewMode === "week"
      ? `${new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(weekDays[0])} – ${new Intl.DateTimeFormat(
          "nl-NL",
          { day: "numeric", month: "short", year: "numeric" }
        ).format(weekDays[6])}`
      : new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric" }).format(anchorDate);

  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
  const feedUrl = feedToken ? `https://stichting-crm.vercel.app/api/calendar/feed?token=${feedToken}` : "";

  return (
    <div>
      <PageHeader
        title="Agenda"
        description={`${tasks.filter((t) => t.status === "open").length} openstaande taken · ${interactions.length} afspraken`}
        action={
          <button className="btn-secondary flex items-center gap-1.5" onClick={openSync}>
            <SyncIcon size={15} /> Synchroniseren
          </button>
        }
      />

      <div className="px-4 sm:px-8 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex gap-2">
            {(["lijst", "week", "maand"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  viewMode === v ? "bg-primary text-white" : "bg-white border border-border text-muted"
                }`}
              >
                {v === "lijst" ? "Lijst" : v === "week" ? "Week" : "Maand"}
              </button>
            ))}
          </div>

          {viewMode === "lijst" ? (
            <div className="flex gap-2">
              {(["aankomend", "verleden", "alles"] as ListFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    filter === f ? "bg-primary text-white" : "bg-white border border-border text-muted"
                  }`}
                >
                  {f === "aankomend" ? "Aankomend" : f === "verleden" ? "Verleden" : "Alles"}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                aria-label="Vorige"
                className="p-1.5 rounded-md border border-border text-muted hover:bg-gray-100"
              >
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setAnchorDate(new Date())} className="btn-secondary text-xs py-1.5 px-2.5">
                Vandaag
              </button>
              <button
                onClick={goNext}
                aria-label="Volgende"
                className="p-1.5 rounded-md border border-border text-muted hover:bg-gray-100"
              >
                <ChevronRight size={16} />
              </button>
              <span className="text-sm font-medium ml-1 capitalize">{rangeLabel}</span>
            </div>
          )}
        </div>

        {viewMode === "lijst" && (
          <>
            {!loading && grouped.length === 0 && (
              <div className="card p-10 text-center">
                <CalendarClock size={28} className="mx-auto text-muted mb-3" />
                <p className="text-sm text-muted">Niets te zien in de agenda.</p>
              </div>
            )}

            <div className="space-y-6">
              {grouped.map(([dateKey, dayItems]) => (
                <div key={dateKey}>
                  <h3 className="text-sm font-semibold text-muted mb-2">{dateHeaderLabel(dateKey)}</h3>
                  <div className="card overflow-hidden">
                    <ul>
                      {dayItems.map((item) => {
                        const Icon = item.kind === "taak" ? CheckSquare : TYPE_ICONS[item.interactionType!];
                        return (
                          <li
                            key={item.id}
                            className="flex items-start gap-3 px-5 py-3 border-b border-border last:border-0"
                          >
                            {item.kind === "taak" ? (
                              <input
                                type="checkbox"
                                checked={item.done}
                                onChange={() => {
                                  const task = tasks.find((t) => `task-${t.id}` === item.id);
                                  if (task) toggleDone(task);
                                }}
                                className="mt-1"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0 mt-0.5">
                                <Icon size={13} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-sm ${item.done ? "line-through text-muted" : ""}`}>{item.title}</p>
                                {item.kind === "taak" && item.priority && (
                                  <Badge color={PRIORITY_COLOR[item.priority]}>{TASK_PRIORITY_LABELS[item.priority]}</Badge>
                                )}
                                {item.kind === "afspraak" && (
                                  <Badge color="#2a78d6">{INTERACTION_TYPE_LABELS[item.interactionType!]}</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted mt-0.5">
                                {item.hasTime &&
                                  new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit" }).format(
                                    new Date(item.timestamp)
                                  ) + " · "}
                                {item.href && item.subtitleName ? (
                                  <Link href={item.href} className="hover:text-primary">
                                    {item.subtitleName}
                                  </Link>
                                ) : (
                                  item.subtitleName || "Geen koppeling"
                                )}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {viewMode === "week" && (
          <div className="overflow-x-auto">
            <div className="card overflow-hidden" style={{ minWidth: 720 }}>
              <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
                <div className="border-b border-r border-border" />
                {weekDays.map((day) => {
                  const key = dateKeyFromDate(day);
                  const isToday = key === todayKey();
                  return (
                    <div key={key} className="border-b border-border px-2 py-2 text-center">
                      <p className="text-[11px] uppercase text-muted">
                        {new Intl.DateTimeFormat("nl-NL", { weekday: "short" }).format(day)}
                      </p>
                      <p
                        className={`text-sm font-semibold mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full ${
                          isToday ? "bg-primary text-white" : ""
                        }`}
                      >
                        {day.getDate()}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="grid border-b border-border" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
                <div className="text-[10px] text-muted px-1 py-1.5 border-r border-border flex items-center">
                  hele dag
                </div>
                {weekDays.map((day) => {
                  const key = dateKeyFromDate(day);
                  const dayItems = (itemsByDateKey.get(key) || []).filter((i) => i.kind === "taak");
                  return (
                    <div key={key} className="px-1 py-1 border-r border-border last:border-r-0 space-y-1 min-h-[32px]">
                      {dayItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            const task = tasks.find((t) => `task-${t.id}` === item.id);
                            if (task) toggleDone(task);
                          }}
                          className={`w-full text-left text-[11px] px-1.5 py-0.5 rounded truncate ${
                            item.done ? "bg-gray-100 text-muted line-through" : "bg-primary-soft text-primary"
                          }`}
                          title={item.title}
                        >
                          {item.title}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>

              <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
                <div>
                  {hours.map((h) => (
                    <div
                      key={h}
                      style={{ height: ROW_HEIGHT }}
                      className="text-right pr-2 pt-0.5 text-[11px] text-muted border-r border-border"
                    >
                      {String(h).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>
                {weekDays.map((day) => {
                  const key = dateKeyFromDate(day);
                  const dayItems = (itemsByDateKey.get(key) || []).filter((i) => i.kind === "afspraak");
                  return (
                    <div
                      key={key}
                      className="relative border-r border-border last:border-r-0"
                      style={{ height: ROW_HEIGHT * hours.length }}
                    >
                      {hours.map((h) => (
                        <div key={h} className="border-b border-border" style={{ height: ROW_HEIGHT }} />
                      ))}
                      {dayItems.map((item) => {
                        const Icon = TYPE_ICONS[item.interactionType!];
                        const style = {
                          top: timeToTop(item.timestamp),
                          height: 46,
                          backgroundColor: TYPE_COLOR[item.interactionType!],
                        };
                        const className =
                          "absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 overflow-hidden text-white text-[11px] leading-tight block";
                        const inner = (
                          <>
                            <div className="flex items-center gap-1 font-medium truncate">
                              <Icon size={11} /> {item.title}
                            </div>
                            <div className="opacity-90 truncate">
                              {new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit" }).format(
                                new Date(item.timestamp)
                              )}
                              {item.subtitleName ? ` · ${item.subtitleName}` : ""}
                            </div>
                          </>
                        );
                        return item.href ? (
                          <Link key={item.id} href={item.href} className={className} style={style}>
                            {inner}
                          </Link>
                        ) : (
                          <div key={item.id} className={className} style={style}>
                            {inner}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {viewMode === "maand" && (
          <div className="overflow-x-auto">
            <div className="card overflow-hidden" style={{ minWidth: 720 }}>
              <div className="grid grid-cols-7 border-b border-border">
                {["ma", "di", "wo", "do", "vr", "za", "zo"].map((d) => (
                  <div
                    key={d}
                    className="text-center text-[11px] uppercase text-muted py-2 border-r border-border last:border-r-0"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthDays.map((day) => {
                  const key = dateKeyFromDate(day);
                  const inMonth = day.getMonth() === anchorDate.getMonth();
                  const isToday = key === todayKey();
                  const dayItems = itemsByDateKey.get(key) || [];
                  const visible = dayItems.slice(0, 3);
                  const extra = dayItems.length - visible.length;
                  return (
                    <div
                      key={key}
                      className={`border-b border-r border-border last:border-r-0 p-1.5 min-h-[92px] ${
                        inMonth ? "" : "bg-gray-50/50"
                      }`}
                    >
                      <p
                        className={`text-xs mb-1 inline-flex items-center justify-center w-5 h-5 rounded-full ${
                          isToday ? "bg-primary text-white" : inMonth ? "text-gray-700" : "text-muted"
                        }`}
                      >
                        {day.getDate()}
                      </p>
                      <div className="space-y-0.5">
                        {visible.map((item) => {
                          const style = {
                            backgroundColor:
                              item.kind === "taak" ? "#eef2ff" : `${TYPE_COLOR[item.interactionType!]}1a`,
                            color: item.kind === "taak" ? "#4338ca" : TYPE_COLOR[item.interactionType!],
                          };
                          const className = "block text-[10px] px-1 py-0.5 rounded truncate";
                          return item.href ? (
                            <Link key={item.id} href={item.href} className={className} style={style}>
                              {item.title}
                            </Link>
                          ) : (
                            <p key={item.id} className={className} style={style}>
                              {item.title}
                            </p>
                          );
                        })}
                        {extra > 0 && <p className="text-[10px] text-muted px-1">+{extra} meer</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={syncOpen} onClose={() => setSyncOpen(false)} title="Synchroniseer met je agenda">
        {feedLoading && !feedToken && <p className="text-sm text-muted">Link genereren...</p>}
        {feedError && <p className="text-sm text-danger mb-3">{feedError}</p>}
        {feedToken && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Abonneer je op onderstaande link in Google Agenda, Apple Agenda of Outlook om al je taken en afspraken
              automatisch in je eigen agenda-app te zien. Agenda-apps vernieuwen een abonnement meestal elke paar
              uur — nieuwe of gewijzigde items verschijnen dus niet direct.
            </p>

            <div>
              <label className="label">Agenda-link</label>
              <div className="flex gap-2">
                <input
                  className="input font-mono text-xs"
                  readOnly
                  value={feedUrl}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  className="btn-secondary shrink-0 flex items-center gap-1.5"
                  onClick={() => handleCopy(feedUrl)}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Gekopieerd" : "Kopiëren"}
                </button>
              </div>
            </div>

            <div className="text-xs text-muted space-y-1">
              <p>
                <span className="font-medium text-foreground">Google Agenda:</span> Instellingen → Agenda&apos;s
                toevoegen → Via URL, en plak de link hierboven.
              </p>
              <p>
                <span className="font-medium text-foreground">Apple Agenda:</span> Archief → Nieuw agenda-abonnement,
                en plak de link.
              </p>
              <p>
                <span className="font-medium text-foreground">Outlook:</span> Agenda toevoegen → Abonneren vanaf
                internet, en plak de link.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-xs text-muted">Link uitgelekt of niet meer nodig?</p>
              <button
                type="button"
                className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
                onClick={handleRegenerate}
                disabled={feedLoading}
              >
                <SyncIcon size={13} /> Nieuwe link genereren
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
