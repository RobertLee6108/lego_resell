interface PageHeaderProps {
  title: string;
  description: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-black">{title}</h1>
      <p className="mt-1 text-sm text-zinc-600">{description}</p>
    </div>
  );
}
