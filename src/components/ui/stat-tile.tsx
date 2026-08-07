const TINTS = {
  neutral: "bg-neutral-100 text-neutral-900",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-blue-50 text-blue-700",
  purple: "bg-violet-50 text-violet-700",
  orange: "bg-orange-50 text-orange-700",
} as const;

export function StatTile({
  label,
  value,
  tint = "neutral",
  valueClassName = "",
}: {
  label: string;
  value: React.ReactNode;
  tint?: keyof typeof TINTS;
  valueClassName?: string;
}) {
  return (
    <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${TINTS[tint]}`}>
      <span className="text-sm">{label}</span>
      <span className={`text-sm font-semibold ${valueClassName}`}>{value}</span>
    </div>
  );
}
