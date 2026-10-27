import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPartnerOverview } from "@/lib/dashboard";
import { formatTarih, formatTL } from "@/lib/format";
import { satisDurumu } from "@/lib/labels";
import { StatCard } from "./stat-card";

export async function PartnerOverview({ partnerId }: { partnerId: string }) {
  const v = await getPartnerOverview(partnerId);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard baslik="Toplam Satışım" deger={formatTL(v.toplamSatis)} aciklama="Tamamlanan satışlar" />
        <StatCard baslik="Kazanılan Hakediş" deger={formatTL(v.kazanilanHakedis)} aciklama="Komisyon toplamı" />
        <StatCard baslik="Bekleyen Ödeme" deger={formatTL(v.bekleyenOdeme)} aciklama="Kurulumu bekleyen satışların hakedişi" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hızlı Proje / Demo Arama</CardTitle>
          <CardDescription>Vitrindeki projelerde ve canlı demolarda arayın.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/panel/vitrin" method="get" className="flex gap-2">
            <Input name="q" placeholder="Örn: klinik, restoran, e-ticaret..." aria-label="Proje ara" />
            <Button type="submit">Ara</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Son Satışlarım</CardTitle>
        </CardHeader>
        <CardContent>
          {v.sonSatislar.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Henüz satış kaydınız yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Proje</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead className="text-right">Hakediş</TableHead>
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
                      <TableCell className="text-right whitespace-nowrap">{formatTL(s.salePrice)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatTL(s.partnerCommission)}</TableCell>
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
