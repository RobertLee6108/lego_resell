interface EmptyStateProps {
  message: string;
  hint?: string;
}

export function EmptyState({ message, hint }: EmptyStateProps) {
  return (
    <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
      {message}
      {hint && <span className="mt-2 block text-zinc-400">{hint}</span>}
    </p>
  );
}
