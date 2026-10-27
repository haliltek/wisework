import { cn } from "@/lib/utils";

// Yazı tabanlı logo (ikon kullanılmaz): "Wise" vurgu renginde, "Software" metin renginde
export function Marka({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-tight", className)}>
      <span className="text-primary">Wise</span> Software
    </span>
  );
}
