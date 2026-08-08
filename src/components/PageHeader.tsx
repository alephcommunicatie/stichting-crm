import ThemeToggle from "@/components/ThemeToggle";

export default function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 sm:px-8 sm:py-6 border-b border-border bg-card">
      <div className="min-w-0">
        {title && <h1 className="text-lg font-semibold truncate">{title}</h1>}
        {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {action}
        <ThemeToggle className="hidden sm:flex" />
      </div>
    </div>
  );
}
