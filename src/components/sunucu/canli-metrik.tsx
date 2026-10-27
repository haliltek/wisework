"use client";

import { useEffect, useRef, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Nokta = { zaman: number; cpu: number; ram: number; disk: number };

const YOKLAMA_MS = 5000;
const EN_FAZLA_NOKTA = 60; // 5 saniyelik aralıkla yaklaşık 5 dakika

const saatBicimi = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Europe/Istanbul",
});

// Sayfa açıkken 5 saniyede bir yenilenen CPU / RAM / Disk grafiği (veri tarayıcıda tutulur)
export function CanliMetrik({ ilk }: { ilk: Nokta }) {
  const [veri, setVeri] = useState<Nokta[]>([ilk]);
  const [hata, setHata] = useState(false);
  const calisiyor = useRef(true);

  useEffect(() => {
    calisiyor.current = true;
    async function oku() {
      try {
        const yanit = await fetch("/api/sunucu/metrik", { cache: "no-store" });
        if (!yanit.ok) throw new Error("başarısız");
        const nokta = (await yanit.json()) as Nokta;
        if (!calisiyor.current) return;
        setHata(false);
        setVeri((onceki) => [...onceki, nokta].slice(-EN_FAZLA_NOKTA));
      } catch {
        if (calisiyor.current) setHata(true);
      }
    }
    const zamanlayici = setInterval(oku, YOKLAMA_MS);
    return () => {
      calisiyor.current = false;
      clearInterval(zamanlayici);
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={veri} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="zaman"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              stroke="var(--muted-foreground)"
              tickFormatter={(v) => saatBicimi.format(new Date(Number(v)))}
              minTickGap={48}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={40}
              stroke="var(--muted-foreground)"
              tickFormatter={(v) => `%${v}`}
            />
            <Tooltip
              labelFormatter={(v) => saatBicimi.format(new Date(Number(v)))}
              formatter={(v, ad) => [`%${v}`, String(ad)]}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--card-foreground)",
              }}
            />
            <Legend iconType="plainline" />
            <Line type="monotone" dataKey="cpu" name="İşlemci" stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="ram" name="Bellek" stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="6 3" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="disk" name="Disk" stroke="var(--warning)" strokeWidth={2} strokeDasharray="2 3" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        {hata
          ? "Canlı veri alınamadı, yeniden denenecek."
          : "Her 5 saniyede bir yenilenir. Sayfayı kapattığınızda geçmiş tutulmaz."}
      </p>
    </div>
  );
}
