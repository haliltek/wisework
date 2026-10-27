import { cn } from "@/lib/utils";

// Doluluk çubuğu: %75 üstü uyarı, %90 üstü kritik renk
export function Progress({ value, className }: { value: number; className?: string }) {
  const yuzde = Math.max(0, Math.min(100, value));
  const renk = yuzde >= 90 ? "bg-destructive" : yuzde >= 75 ? "bg-warning" : "bg-primary";
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(yuzde)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div className={cn("h-full rounded-full transition-all", renk)} style={{ width: `${yuzde}%` }} />
    </div>
  );
}
