import { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <div className="card p-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
        {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
      </div>
      <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
        <Icon size={18} className="text-primary" />
      </div>
    </div>
  );
}
