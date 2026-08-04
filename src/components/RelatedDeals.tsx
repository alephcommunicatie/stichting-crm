"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Deal, PipelineStage } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import DealFormModal from "@/components/deals/DealFormModal";
import Badge from "@/components/ui/Badge";
import { Plus } from "lucide-react";

export default function RelatedDeals({
  contactId,
  organizationId,
}: {
  contactId?: string;
  organizationId?: string;
}) {
  const supabase = createClient();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    let query = supabase.from("deals").select("*").order("created_at", { ascending: false });
    if (contactId) query = query.eq("contact_id", contactId);
    if (organizationId) query = query.eq("organization_id", organizationId);
    const [{ data: dealsData }, { data: stagesData }] = await Promise.all([
      query,
      supabase.from("pipeline_stages").select("*").order("position"),
    ]);
    setDeals((dealsData as Deal[]) || []);
    setStages((stagesData as PipelineStage[]) || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, organizationId]);

  const stageMap = Object.fromEntries(stages.map((s) => [s.id, s]));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Pipeline / kansen</h3>
        <button className="btn-secondary flex items-center gap-1 text-xs py-1.5" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Kans
        </button>
      </div>
      {deals.length === 0 && <p className="text-sm text-muted py-2">Geen kansen.</p>}
      <ul className="space-y-2">
        {deals.map((d) => {
          const stage = d.stage_id ? stageMap[d.stage_id] : null;
          return (
            <li key={d.id} className="card p-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{d.title}</p>
                <p className="text-xs text-muted">{formatCurrency(d.amount, d.currency)}</p>
              </div>
              {stage && <Badge color={stage.color}>{stage.name}</Badge>}
            </li>
          );
        })}
      </ul>

      <DealFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        defaultContactId={contactId}
        defaultOrganizationId={organizationId}
      />
    </div>
  );
}
