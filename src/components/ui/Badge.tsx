export default function Badge({
  children,
  color = "#6366f1",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      {children}
    </span>
  );
}
