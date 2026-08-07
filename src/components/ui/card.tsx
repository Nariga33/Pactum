export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
