import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-white/50">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold tracking-wide text-white/80 uppercase">
        {children}
      </h2>
      {hint ? <p className="mt-1 text-xs text-white/40">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/12 px-4 py-8 text-center text-sm text-white/40">
      {children}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  draft: "border-white/15 bg-white/5 text-white/60",
  open: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  locked: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  completed: "border-moon-500/30 bg-moon-600/15 text-moon-400",
  received: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  forfeited: "border-red-400/30 bg-red-400/10 text-red-200",
  skipped: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  proposed: "border-glow-400/30 bg-glow-400/10 text-glow-300",
  allocated: "border-glow-400/30 bg-glow-400/10 text-glow-300",
  pending: "border-white/15 bg-white/5 text-white/60",
  unfilled: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  penalized: "border-red-400/30 bg-red-400/10 text-red-200",
  carried: "border-moon-500/40 bg-moon-600/20 text-moon-300",
  admin: "border-moon-500/40 bg-moon-600/20 text-moon-400",
  member: "border-white/15 bg-white/5 text-white/60",
  inactive: "border-red-400/30 bg-red-400/10 text-red-200",
  gear_queue: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  random_queue: "border-blue-400/30 bg-blue-400/10 text-blue-200",
  title_random: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  fifo_queue: "border-white/15 bg-white/5 text-white/60",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  return (
    <span
      className={`badge ${statusStyles[status] ?? "border-white/15 bg-white/5 text-white/60"}`}
    >
      {label}
    </span>
  );
}

/** Queue position pill. Position 1 is highlighted as "next in line". */
export function PositionBadge({ position }: { position: number }) {
  const isNext = position === 1;
  return (
    <span
      className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-semibold tabular-nums ${
        isNext
          ? "bg-glow-400 text-night-950"
          : "border border-white/12 bg-white/5 text-white/70"
      }`}
    >
      {position}
    </span>
  );
}

export function ItemThumb({
  src,
  alt,
  size = "md",
  quality,
}: {
  src: string | null;
  alt: string;
  size?: "sm" | "md";
  quality?: "orange";
}) {
  const dimension = size === "sm" ? "size-9" : "size-12";
  const isOrangeRelic =
    quality === "orange" ||
    alt.startsWith("Orange Relic") ||
    alt.startsWith("Relic สีส้ม");
  const qualityStyle =
    isOrangeRelic
      ? "border-amber-400/60 bg-amber-400/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
      : "border-white/10 bg-night-900";
  if (!src) {
    return (
      <span
        aria-hidden
        className={`${dimension} grid shrink-0 place-items-center rounded-lg border border-white/10 bg-gradient-to-br from-night-700 to-night-900 text-xs font-semibold text-white/40`}
      >
        {alt.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    // Item art is pasted in from arbitrary wikis, so next/image remote config
    // would need updating for every new host.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`${dimension} shrink-0 rounded-lg border object-cover ${qualityStyle}`}
    />
  );
}
