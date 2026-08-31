import { Loader2 } from "lucide-react";

const sizes = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-6",
} as const;

export function Spinner({
  size = "md",
  className = "",
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <Loader2
      className={`animate-spin ${sizes[size]} ${className}`}
      aria-hidden
    />
  );
}

export function LoadingState({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-2 text-sm text-white/45 ${className}`}
      role="status"
    >
      <Spinner size="sm" />
      {label ? <span>{label}</span> : null}
    </div>
  );
}

export function PageLoader({ label }: { label?: string }) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-white/50"
      role="status"
    >
      <Spinner size="lg" />
      {label ? <p className="text-sm">{label}</p> : null}
    </div>
  );
}
