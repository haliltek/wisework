import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminOverview } from "@/lib/dashboard";
import { formatTarih, formatTL } from "@/lib/format";
import { satisDurumu } from "@/lib/labels";
import { RevenueChart } from "./revenue-chart";
import { StatCard } from "./stat-card";
import { UsageBars } from "./usage-bars";

export async function AdminOverview() {
  const v = await getAdminOverview();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          baslik="Aylık Tekrarlayan Gelir (MRR)"
          deger={formatTL(v.mrr)}
          aciklama="Çalışan SaaS abonelikleri"
        />
        <StatCard
          baslik="Toplam Satış Cirosu"
          deger={formatTL(v.toplamCiro)}
          aciklama={`Şirkete kalan net: ${formatTL(v.netGelir)}`}
        />
        <StatCard baslik="Aktif SaaS Müşteri" deger={String(v.aktifSaas)} aciklama="Çalışan kiracılar" />
        <StatCard
          baslik="Lisanslar"
          deger={`${v.aktifLisans} aktif / ${v.askidaLisans} askıda`}
          aciklama="Askıdaki lisanslar kilitlidir"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Aylık Satış Cirosu</CardTitle>
            <CardDescription>Son 6 ayın tamamlanan satışları</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart veri={v.aylikCiro} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sunucu Durumu</CardTitle>
            <CardDescription>Uygulamanın çalıştığı sunucu, anlık</CardDescription>
          </CardHeader>
          <CardContent>
            <UsageBars />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Son Satışlar</CardTitle>
        </CardHeader>
        <CardContent>
          {v.sonSatislar.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Henüz satış kaydı yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Proje</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Bayi</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {v.sonSatislar.map((s) => {
                  const durum = satisDurumu(s.status);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap">{formatTarih(s.createdAt)}</TableCell>
                      <TableCell className="font-medium">{s.project.title}</TableCell>
                      <TableCell>{s.customer.companyName}</TableCell>
                      <TableCell>{s.partner.companyName ?? s.partner.name}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatTL(s.salePrice)}</TableCell>
                      <TableCell>
                        <Badge variant={durum.renk}>{durum.etiket}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
