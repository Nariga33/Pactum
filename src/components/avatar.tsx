function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-20 w-20 text-2xl",
} as const;

export function Avatar({
  name,
  image,
  size = "sm",
}: {
  name: string;
  image?: string | null;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const sizeClass = SIZE_CLASSES[size];

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary data: URLs, not a next/image-friendly source
      <img
        src={image}
        alt={name}
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-1 ring-black/5`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-neutral-200 font-medium text-neutral-600 ring-1 ring-black/5`}
    >
      {initialsOf(name)}
    </div>
  );
}
