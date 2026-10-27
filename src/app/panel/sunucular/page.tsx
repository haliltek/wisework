import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CanliMetrik } from "@/components/sunucu/canli-metrik";
import { KonteynerBellekGrafigi } from "@/components/sunucu/konteyner-bellek-grafigi";
import { UsageBars } from "@/components/dashboard/usage-bars";
import {
  dockerOzetiAl,
  dockerYapilandirildiMi,
  konteynerleriListele,
  type DockerOzeti,
  type KonteynerOzeti,
} from "@/lib/docker";
import { formatTarih, formatSayi } from "@/lib/format";
import { KONTEYNER_DURUMLARI, SAGLAYICI_ETIKETLERI } from "@/lib/labels";
import { getSistemDurumu } from "@/lib/system";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Sunucu & Konteynerler" };
export const dynamic = "force-dynamic";

// Sunucu türü etiketleri (ServerKind)
const TUR_ETIKETLERI: Record<string, string> = {
  VPS: "Sanal Sunucu",
  HOSTING: "Hosting",
  DEDICATED: "Dedike Sunucu",
};

// Dolar bazlı sağlayıcı maliyeti (DigitalOcean USD fatura eder)
const dolarBicimi = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

// Bu uygulamaya ait konteynerler (diğer sistemler yalnızca izlenir)
function buUygulamaMi(k: KonteynerOzeti): boolean {
  return k.ad.startsWith("wise-") || k.projeAdi === "software-factory";
}

function KonteynerTablosu({ liste }: { liste: KonteynerOzeti[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ad</TableHead>
          <TableHead>İmaj</TableHead>
          <TableHead>Proje</TableHead>
          <TableHead>Durum</TableHead>
          <TableHead>Çalışma</TableHead>
          <TableHead>Dış Portlar</TableHead>
          <TableHead className="text-right">Bellek</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {liste.map((k) => {
          const durum = KONTEYNER_DURUMLARI[k.durumKodu];
          return (
            <TableRow key={k.id}>
              <TableCell className="font-medium">{k.ad}</TableCell>
              <TableCell className="max-w-56 truncate font-mono text-xs" title={k.imaj}>
                {k.imaj}
              </TableCell>
              <TableCell>{k.projeAdi ?? "-"}</TableCell>
              <TableCell>
                <Badge variant={durum.renk}>{durum.etiket}</Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{k.durumMetni}</TableCell>
              <TableCell className="font-mono text-xs">{k.portlar.length ? k.portlar.join(", ") : "-"}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                {k.bellekMb != null
                  ? `${formatSayi(k.bellekMb)} MB${k.bellekLimitMb && k.bellekLimitMb < 16384 ? ` / ${formatSayi(k.bellekLimitMb)}` : ""}`
                  : "-"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default async function SunucularSayfasi() {
  await requirePermission("servers:view");

  // Docker verisi: vekil yoksa veya erişilemezse sayfa yine de açılır
  let konteynerler: KonteynerOzeti[] = [];
  let dockerOzeti: DockerOzeti | null = null;
  let dockerHatasi: string | null = null;
  if (!dockerYapilandirildiMi()) {
    dockerHatasi = "Docker bağlantısı tanımlı değil (DOCKER_API_URL).";
  } else {
    try {
      [konteynerler, dockerOzeti] = await Promise.all([konteynerleriListele(), dockerOzetiAl()]);
    } catch {
      dockerHatasi = "Docker'a ulaşılamadı. Docker vekil konteynerinin çalıştığını kontrol edin.";
    }
  }

  const ilkSistem = await getSistemDurumu();
  const ilkNokta = {
    zaman: Date.now(),
    cpu: Math.round(ilkSistem.cpuYuzde * 10) / 10,
    ram: Math.round(ilkSistem.ramYuzde * 10) / 10,
    disk: Math.round(ilkSistem.diskYuzde * 10) / 10,
  };

  const buUygulama = konteynerler.filter(buUygulamaMi);
  const digerleri = konteynerler.filter((k) => !buUygulamaMi(k));
  const bellekGrafigi = konteynerler
    .filter((k) => k.bellekMb != null)
    .sort((a, b) => (b.bellekMb ?? 0) - (a.bellekMb ?? 0))
    .slice(0, 15)
    .map((k) => ({ ad: k.ad, bellekMb: Math.round((k.bellekMb ?? 0) * 10) / 10, vurgulu: buUygulamaMi(k) }));

  const sunucular = await prisma.serverNode.findMany({
    orderBy: [{ providerAccountId: "asc" }, { name: "asc" }],
    include: { providerAccount: { select: { label: true, kind: true } } },
  });

  const cevrimici = sunucular.filter((s) => s.isOnline).length;
  const aylikToplam = sunucular.reduce((toplam, s) => toplam + (s.monthlyCost ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">Altyapı / Sunucular</p>
        <h1 className="text-2xl font-semibold tracking-tight">Sunucu & Konteynerler</h1>
        <p className="text-sm text-muted-foreground">
          Sağlayıcı hesaplarından eşitlenen sunucular, panelin çalıştığı sunucunun canlı kaynak kullanımı ve
          üzerindeki Docker konteynerleri. Konteynerler yalnızca izlenir; başlatma ve durdurma işlemleri sonraki
          adımda eklenecek.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Toplam sunucu</CardDescription>
            <CardTitle className="text-2xl">{sunucular.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Çevrimiçi</CardDescription>
            <CardTitle className="text-2xl">{cevrimici}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Aylık toplam maliyet</CardDescription>
            <CardTitle className="text-2xl">{dolarBicimi.format(aylikToplam)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sunucu Envanteri</CardTitle>
          <CardDescription>{sunucular.length} kayıt</CardDescription>
        </CardHeader>
        <CardContent>
          {sunucular.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Henüz sunucu kaydı yok. Sağlayıcı Hesapları ekranından bir hesabı eşitleyin.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead>Sağlayıcı</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>IP Adresi</TableHead>
                  <TableHead>Bölge</TableHead>
                  <TableHead className="text-right">vCPU</TableHead>
                  <TableHead className="text-right">RAM (GB)</TableHead>
                  <TableHead className="text-right">Disk (GB)</TableHead>
                  <TableHead className="text-right">Aylık Maliyet</TableHead>
                  <TableHead>Bitiş Tarihi</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sunucular.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      {s.providerAccount
                        ? `${s.providerAccount.label}`
                        : "Elle girildi"}
                      {s.providerAccount && (
                        <span className="block text-xs text-muted-foreground">
                          {SAGLAYICI_ETIKETLERI[s.providerAccount.kind] ?? s.providerAccount.kind}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{TUR_ETIKETLERI[s.kind] ?? s.kind}</TableCell>
                    <TableCell className="font-mono text-xs">{s.ipAddress}</TableCell>
                    <TableCell>{s.region ?? "-"}</TableCell>
                    <TableCell className="text-right">{s.cpuCores}</TableCell>
                    <TableCell className="text-right">{formatSayi(s.ramTotalGb)}</TableCell>
                    <TableCell className="text-right">{formatSayi(s.diskTotalGb)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {s.monthlyCost != null ? dolarBicimi.format(s.monthlyCost) : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {s.expiresAt ? formatTarih(s.expiresAt) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.isOnline ? "success" : "destructive"}>
                        {s.isOnline ? "Çevrimiçi" : "Çevrimdışı"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Kaynak Kullanımı</CardTitle>
            <CardDescription>Panelin çalıştığı sunucu, anlık</CardDescription>
          </CardHeader>
          <CardContent>
            <UsageBars />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Canlı Metrikler</CardTitle>
            <CardDescription>İşlemci, bellek ve disk doluluğu (yüzde)</CardDescription>
          </CardHeader>
          <CardContent>
            <CanliMetrik ilk={ilkNokta} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Docker Konteynerleri</CardTitle>
          <CardDescription>
            {dockerOzeti
              ? `${dockerOzeti.toplam} konteyner · ${dockerOzeti.calisan} çalışıyor · ${dockerOzeti.durdurulan} durdurulmuş · ${dockerOzeti.imajSayisi} imaj · Docker ${dockerOzeti.surum}`
              : "Panelin çalıştığı sunucudaki konteynerler"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dockerHatasi ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{dockerHatasi}</p>
          ) : konteynerler.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Konteyner bulunamadı.</p>
          ) : (
            <div className="space-y-8">
              <div>
                <h3 className="mb-2 text-sm font-medium">Bellek kullanımı (ilk 15 konteyner)</h3>
                <KonteynerBellekGrafigi veri={bellekGrafigi} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium">Wise Software konteynerleri ({buUygulama.length})</h3>
                {buUygulama.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Bu uygulamaya ait konteyner bulunamadı.</p>
                ) : (
                  <KonteynerTablosu liste={buUygulama} />
                )}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium">Sunucudaki diğer sistemler ({digerleri.length})</h3>
                <p className="mb-2 text-xs text-muted-foreground">
                  Yalnızca görüntülenir; bu konteynerler üzerinde panelden işlem yapılamaz.
                </p>
                {digerleri.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Başka konteyner yok.</p>
                ) : (
                  <KonteynerTablosu liste={digerleri} />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
