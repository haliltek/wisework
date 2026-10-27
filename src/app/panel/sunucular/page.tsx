import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTarih, formatSayi } from "@/lib/format";
import { SAGLAYICI_ETIKETLERI } from "@/lib/labels";
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

export default async function SunucularSayfasi() {
  await requirePermission("servers:view");

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
          Sağlayıcı hesaplarından eşitlenen sunucular ve kaynak bilgileri. Konteyner listesi ve işlemler sonraki
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
    </div>
  );
}
