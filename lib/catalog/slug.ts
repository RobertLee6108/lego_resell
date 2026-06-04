export function slugifyTheme(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  if (base.length > 0) return base;
  return `theme-${Date.now().toString(36)}`;
}
