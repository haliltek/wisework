"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatTL } from "@/lib/format";

type RevenueChartProps = { veri: { ay: string; ciro: number }[] };

// Aylık satış cirosu (son 6 ay)
export function RevenueChart({ veri }: RevenueChartProps) {
  if (veri.every((o) => o.ciro === 0)) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Bu dönemde tamamlanmış satış bulunmuyor.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={veri} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="ay" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={64}
            stroke="var(--muted-foreground)"
            tickFormatter={(v) => (Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)} bin` : String(v))}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            formatter={(v) => [formatTL(Number(v)), "Ciro"]}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--card-foreground)",
            }}
          />
          <Bar dataKey="ciro" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
