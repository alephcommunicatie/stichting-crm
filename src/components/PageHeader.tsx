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
    <div className="flex items-center justify-between px-8 py-6 border-b border-border bg-card">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}
