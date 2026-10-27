"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Satir = { ad: string; bellekMb: number; vurgulu: boolean };

// En çok bellek kullanan konteynerler (yatay çubuk). Bu uygulamaya ait olanlar vurgulanır.
export function KonteynerBellekGrafigi({ veri }: { veri: Satir[] }) {
  if (veri.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Bellek verisi olan çalışan konteyner yok.
      </div>
    );
  }

  const yukseklik = Math.max(180, veri.length * 28 + 32);

  return (
    <div style={{ height: yukseklik }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={veri} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            stroke="var(--muted-foreground)"
            tickFormatter={(v) => `${v} MB`}
          />
          <YAxis
            type="category"
            dataKey="ad"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={150}
            stroke="var(--muted-foreground)"
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            formatter={(v) => [`${Number(v).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`, "Bellek"]}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--card-foreground)",
            }}
          />
          <Bar
            dataKey="bellekMb"
            radius={[0, 4, 4, 0]}
            // Her çubuğun rengi veriden gelir: vurgulu olan ana renk, diğerleri açık ton
            shape={(props: { x?: number; y?: number; width?: number; height?: number; payload?: Satir }) => {
              const { x = 0, y = 0, width = 0, height = 0, payload } = props;
              return (
                <rect
                  x={x}
                  y={y}
                  width={Math.max(width, 0)}
                  height={height}
                  rx={4}
                  fill={payload?.vurgulu ? "var(--chart-1)" : "var(--chart-2)"}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
