"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useActiveOrg } from "@/components/OrgProvider";
import PageHeader from "@/components/PageHeader";
import DealFormModal from "@/components/deals/DealFormModal";
import { Deal, PipelineStage } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Plus, GripVertical } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import NoOrgSelected from "@/components/NoOrgSelected";

function DealCard({ deal, onEdit }: { deal: Deal; onEdit?: (deal: Deal) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card p-3 mb-2 ${isDragging ? "opacity-50 shadow-lg" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          {...attributes}
          className="cursor-grab text-muted hover:text-foreground mt-0.5 touch-none"
        >
          <GripVertical size={14} />
        </button>
        <button
          type="button"
          onClick={() => onEdit?.(deal)}
          className="min-w-0 flex-1 text-left cursor-pointer"
        >
          <p className="text-sm font-medium truncate hover:text-primary">{deal.title}</p>
          <p className="text-xs text-muted mt-1">{formatCurrency(deal.amount, deal.currency)}</p>
        </button>
      </div>
    </div>
  );
}

function StageColumn({
  stage,
  deals,
  total,
  onEditDeal,
}: {
  stage: PipelineStage;
  deals: Deal[];
  total: number;
  onEditDeal: (deal: Deal) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 rounded-xl border border-border bg-gray-50/60 dark:bg-white/5 flex flex-col ${isOver ? "ring-2 ring-primary" : ""}`}
    >
      <div className="px-3 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="text-sm font-semibold">{stage.name}</h3>
          <span className="text-xs text-muted ml-auto">{deals.length}</span>
        </div>
        <p className="text-xs text-muted mt-1">{formatCurrency(total)}</p>
      </div>
      <div className="p-2 flex-1 min-h-[100px] overflow-y-auto">
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} onEdit={onEditDeal} />
        ))}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const supabase = createClient();
  const { activeOrgId, isAllOrgsMode, hasActiveOrg } = useActiveOrg();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function load() {
    setLoading(true);
    let dealsQuery = supabase.from("deals").select("*").eq("status", "open").order("created_at", { ascending: false });
    if (!isAllOrgsMode) dealsQuery = dealsQuery.eq("organization_id", activeOrgId);
    const [{ data: stagesData }, { data: dealsData }] = await Promise.all([
      supabase.from("pipeline_stages").select("*").order("position"),
      dealsQuery,
    ]);
    setStages((stagesData as PipelineStage[]) || []);
    setDeals((dealsData as Deal[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    if (!hasActiveOrg) {
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, isAllOrgsMode, hasActiveOrg]);

  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const stage of stages) map[stage.id] = [];
    for (const deal of deals) {
      if (deal.stage_id && map[deal.stage_id]) map[deal.stage_id].push(deal);
    }
    return map;
  }, [stages, deals]);

  const totalPipelineValue = deals.reduce((sum, d) => sum + Number(d.amount), 0);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const dealId = active.id as string;
    const newStageId = over.id as string;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === newStageId) return;

    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage_id: newStageId } : d)));

    const targetStage = stages.find((s) => s.id === newStageId);
    const updates: Partial<Deal> = { stage_id: newStageId };
    if (targetStage?.is_won || targetStage?.is_lost) {
      updates.status = targetStage.is_won ? "won" : "lost";
    }
    await supabase.from("deals").update(updates).eq("id", dealId);
    if (targetStage?.is_won || targetStage?.is_lost) {
      load();
    }
  }

  const activeDeal = deals.find((d) => d.id === activeId);

  if (!hasActiveOrg) {
    return <NoOrgSelected />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen">
      <PageHeader
        title="Pipeline"
        description={`${deals.length} openstaande kansen · ${formatCurrency(totalPipelineValue)}`}
        action={
          <button className="btn-primary flex items-center gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Nieuwe kans
          </button>
        }
      />

      <div className="flex-1 overflow-x-auto px-4 sm:px-8 py-5">
        {!loading && (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 h-full">
              {stages.map((stage) => (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  deals={dealsByStage[stage.id] || []}
                  total={(dealsByStage[stage.id] || []).reduce((s, d) => s + Number(d.amount), 0)}
                  onEditDeal={setEditingDeal}
                />
              ))}
            </div>
            <DragOverlay>{activeDeal ? <DealCard deal={activeDeal} /> : null}</DragOverlay>
          </DndContext>
        )}
      </div>

      <DealFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} />
      <DealFormModal
        open={!!editingDeal}
        onClose={() => setEditingDeal(null)}
        onSaved={load}
        deal={editingDeal}
      />
    </div>
  );
}
