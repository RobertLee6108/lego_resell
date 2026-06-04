interface StatGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
}

export function StatGrid({ children, columns = 3 }: StatGridProps) {
  const colClass =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : columns === 5
          ? "sm:grid-cols-2 lg:grid-cols-5"
          : "sm:grid-cols-3";

  return <div className={`grid gap-4 ${colClass}`}>{children}</div>;
}

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}

export function StatCard({
  label,
  value,
  valueClassName = "text-zinc-900",
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <dt className="text-xs font-medium text-zinc-500">{label}</dt>
      <dd className={`mt-1 text-2xl font-bold ${valueClassName}`}>{value}</dd>
    </div>
  );
}
