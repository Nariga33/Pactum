const GRADIENTS = {
  violet: "from-violet-600 via-violet-500 to-fuchsia-500",
  emerald: "from-emerald-600 via-emerald-500 to-teal-500",
  dark: "from-neutral-900 via-neutral-800 to-violet-950",
  rose: "from-rose-600 via-red-500 to-orange-500",
} as const;

export function GradientBubble({
  label,
  value,
  sublabel,
  gradient = "violet",
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  gradient?: keyof typeof GRADIENTS;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br p-5 text-white shadow-sm ${GRADIENTS[gradient]} ${className}`}
    >
      <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-white/70">{sublabel}</p>}
    </div>
  );
}
