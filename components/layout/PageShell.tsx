interface PageShellProps {
  children: React.ReactNode;
}

/** 카탈로그 페이지와 동일한 세로 간격·구조 */
export function PageShell({ children }: PageShellProps) {
  return <div className="space-y-6">{children}</div>;
}
