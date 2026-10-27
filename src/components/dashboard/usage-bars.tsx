import { Progress } from "@/components/ui/progress";
import { formatSayi } from "@/lib/format";
import { getSistemDurumu } from "@/lib/system";

function Satir({ etiket, metin, yuzde }: { etiket: string; metin: string; yuzde: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{etiket}</span>
        <span className="text-muted-foreground">{metin}</span>
      </div>
      <Progress value={yuzde} />
    </div>
  );
}

// Sunucu anlık CPU / RAM / Disk doluluk çubukları
export async function UsageBars() {
  const d = await getSistemDurumu();

  return (
    <div className="space-y-4">
      <Satir
        etiket="İşlemci (CPU)"
        metin={`%${formatSayi(d.cpuYuzde)} · ${d.cekirdek} çekirdek`}
        yuzde={d.cpuYuzde}
      />
      <Satir
        etiket="Bellek (RAM)"
        metin={`${formatSayi(d.ramKullanilanGb)} / ${formatSayi(d.ramToplamGb)} GB`}
        yuzde={d.ramYuzde}
      />
      <Satir
        etiket="Disk"
        metin={`${formatSayi(d.diskKullanilanGb)} / ${formatSayi(d.diskToplamGb)} GB`}
        yuzde={d.diskYuzde}
      />
      <p className="text-xs text-muted-foreground">
        Çalışma süresi: {formatSayi(d.calismaSuresiGun)} gün
      </p>
    </div>
  );
}
