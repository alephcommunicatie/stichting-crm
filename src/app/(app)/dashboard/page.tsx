"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useActiveOrg } from "@/components/OrgProvider";
import { ALL_ORGS_ID } from "@/lib/organizations";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Deal, Task, PipelineStage, Interaction, Contact } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Users, Wallet, CheckSquare, Activity, Building2, ArrowRight, Wrench } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
  LineChart,
  Line,
} from "recharts";

// Validated categorical palette (dataviz skill reference palette, light mode, slots 1-6)
const STAGE_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
const SEQUENTIAL_BLUE = "#2a78d6";

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const { activeOrgId, isAllOrgsMode, hasActiveOrg, memberships, isDeveloper } = useActiveOrg();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  async function chooseOrganization(organizationId: string) {
    setSelecting(organizationId);
    setPickError(null);
    try {
      const res = await fetch("/api/organization/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: organizationId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Kiezen mislukt");
      }
      router.refresh();
      setSelecting(null);
    } catch (err) {
      setPickError(err instanceof Error ? err.message : "Kiezen mislukt");
      setSelecting(null);
    }
  }

  useEffect(() => {
    if (!hasActiveOrg) {
      setLoading(false);
      return;
    }
    async function load() {
      let contactsQuery = supabase.from("contacts").select("*");
      let dealsQuery = supabase.from("deals").select("*");
      let tasksQuery = supabase.from("tasks").select("*");
      let interactionsQuery = supabase
        .from("interactions")
        .select("*")
        .order("interaction_date", { ascending: false })
        .limit(500);
      if (!isAllOrgsMode) {
        contactsQuery = contactsQuery.eq("organization_id", activeOrgId);
        dealsQuery = dealsQuery.eq("organization_id", activeOrgId);
        tasksQuery = tasksQuery.eq("organization_id", activeOrgId);
        interactionsQuery = interactionsQuery.eq("organization_id", activeOrgId);
      }
      const [c, d, s, t, i] = await Promise.all([
        contactsQuery,
        dealsQuery,
        supabase.from("pipeline_stages").select("*").order("position"),
        tasksQuery,
        interactionsQuery,
      ]);
      setContacts((c.data as Contact[]) || []);
      setDeals((d.data as Deal[]) || []);
      setStages((s.data as PipelineStage[]) || []);
      setTasks((t.data as Task[]) || []);
      setInteractions((i.data as Interaction[]) || []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, isAllOrgsMode]);

  const openDeals = useMemo(() => deals.filter((d) => d.status === "open"), [deals]);
  const pipelineValue = openDeals.reduce((s, d) => s + Number(d.amount), 0);
  const openTasks = tasks.filter((t) => t.status === "open");
  const activeContacts = contacts.filter((c) => c.status === "actief");

  const stageChartData = useMemo(
    () =>
      stages
        .filter((s) => !s.is_won && !s.is_lost)
        .map((s) => ({
          name: s.name,
          waarde: openDeals.filter((d) => d.stage_id === s.id).reduce((sum, d) => sum + Number(d.amount), 0),
        })),
    [stages, openDeals]
  );

  const monthlyInteractions = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("nl-NL", { month: "short" }),
        count: 0,
      });
    }
    for (const item of interactions) {
      const d = new Date(item.interaction_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.count += 1;
    }
    return months;
  }, [interactions]);

  if (!hasActiveOrg) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Kies een organisatie om verder te gaan" />
        <div className="px-4 sm:px-8 py-6">
          <p className="text-sm text-muted mb-5">
            Kies hieronder de organisatie waarmee je wilt werken. Je komt dan in het aparte gedeelte van
            het CRM met pipeline, taken, agenda en e-mail voor die organisatie.
          </p>

          {pickError && (
            <div className="mb-4 text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 max-w-md">
              {pickError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
            {memberships.map((m) => (
              <button
                key={m.id}
                onClick={() => chooseOrganization(m.id)}
                disabled={selecting !== null}
                className="card p-5 text-left flex items-center gap-3 hover:border-primary transition-colors disabled:opacity-60"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Building2 size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-xs text-muted">{m.role === "owner" ? "Eigenaar" : "Lid"}</p>
                </div>
                <ArrowRight size={16} className="text-muted shrink-0" />
              </button>
            ))}

            {isDeveloper && (
              <button
                onClick={() => chooseOrganization(ALL_ORGS_ID)}
                disabled={selecting !== null}
                className="card p-5 text-left flex items-center gap-3 hover:border-primary transition-colors disabled:opacity-60 border-dashed"
              >
                <div className="w-10 h-10 rounded-lg bg-[#d97706]/10 text-[#d97706] flex items-center justify-center shrink-0">
                  <Wrench size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Alle organisaties</p>
                  <p className="text-xs text-muted">Developer-modus</p>
                </div>
                <ArrowRight size={16} className="text-muted shrink-0" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const showOrgSwitcher = memberships.length > 1 || isDeveloper;

  return (
    <div>
      <PageHeader title="Dashboard" description="Overzicht van je relatiebeheer" />

      <div className="px-4 sm:px-8 py-6 space-y-6">
        {showOrgSwitcher && (
          <div>
            <p className="text-xs font-medium text-muted mb-2">Jouw organisaties</p>
            {pickError && (
              <div className="mb-2 text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 max-w-md">
                {pickError}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {memberships.map((m) => {
                const isActive = !isAllOrgsMode && m.id === activeOrgId;
                return (
                  <button
                    key={m.id}
                    onClick={() => chooseOrganization(m.id)}
                    disabled={selecting !== null}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-60 ${
                      isActive
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-foreground border-border hover:border-primary"
                    }`}
                  >
                    <Building2 size={14} />
                    {m.name}
                  </button>
                );
              })}
              {isDeveloper && (
                <button
                  onClick={() => chooseOrganization(ALL_ORGS_ID)}
                  disabled={selecting !== null}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-60 ${
                    isAllOrgsMode
                      ? "bg-[#d97706] text-white border-[#d97706]"
                      : "bg-white text-foreground border-border border-dashed hover:border-[#d97706]"
                  }`}
                >
                  <Wrench size={14} />
                  Alle organisaties
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Actieve relaties" value={loading ? "-" : activeContacts.length} icon={Users} hint={`${contacts.length} totaal`} />
          <StatCard label="Pipeline-waarde" value={loading ? "-" : formatCurrency(pipelineValue)} icon={Wallet} hint={`${openDeals.length} openstaande kansen`} />
          <StatCard label="Open taken" value={loading ? "-" : openTasks.length} icon={CheckSquare} hint={`${tasks.length} totaal`} />
          <StatCard label="Contactmomenten" value={loading ? "-" : interactions.length} icon={Activity} hint="laatste 500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-1">Pipeline-waarde per fase</h3>
            <p className="text-xs text-muted mb-4">Openstaande kansen, geëxcludeerd gewonnen/verloren</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stageChartData} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#898781" }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#898781" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  formatter={((value: unknown) => formatCurrency(Number(value) || 0)) as never}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Bar dataKey="waarde" radius={[4, 4, 0, 0]} maxBarSize={56}>
                  <LabelList
                    dataKey="waarde"
                    position="top"
                    formatter={((v: unknown) => (Number(v) > 0 ? formatCurrency(Number(v)) : "")) as never}
                    style={{ fontSize: 11, fill: "#52514e" }}
                  />
                  {stageChartData.map((_, index) => (
                    <Cell key={index} fill={STAGE_COLORS[index % STAGE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-1">Contactmomenten per maand</h3>
            <p className="text-xs text-muted mb-4">Laatste 6 maanden</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyInteractions} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#898781" }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#898781" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Line type="monotone" dataKey="count" name="Contactmomenten" stroke={SEQUENTIAL_BLUE} strokeWidth={2} dot={{ r: 4, fill: SEQUENTIAL_BLUE }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
