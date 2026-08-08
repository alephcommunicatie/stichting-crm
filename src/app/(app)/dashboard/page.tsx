"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useActiveOrg } from "@/components/OrgProvider";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Deal, Task, PipelineStage, Interaction, Contact } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Users, Wallet, CheckSquare, Activity } from "lucide-react";
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
  const { activeOrgId } = useActiveOrg();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [c, d, s, t, i] = await Promise.all([
        supabase.from("contacts").select("*").eq("organization_id", activeOrgId),
        supabase.from("deals").select("*").eq("organization_id", activeOrgId),
        supabase.from("pipeline_stages").select("*").order("position"),
        supabase.from("tasks").select("*").eq("organization_id", activeOrgId),
        supabase
          .from("interactions")
          .select("*")
          .eq("organization_id", activeOrgId)
          .order("interaction_date", { ascending: false })
          .limit(500),
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
  }, [activeOrgId]);

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

  return (
    <div>
      <PageHeader title="Dashboard" description="Overzicht van je relatiebeheer" />

      <div className="px-4 sm:px-8 py-6 space-y-6">
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
