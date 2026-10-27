import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatSayi, formatTarih } from "@/lib/format";
import { SAGLAYICI_ETIKETLERI, type RozetRengi } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { kayitliWhmHesaplari } from "@/lib/providers/whm";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Alan Adları & Hosting" };
export const dynamic = "force-dynamic";

const GUN_MS = 86_400_000;

const DURUM_ETIKETLERI: Record<string, string> = {
  ACTIVE: "Aktif",
  EXPIRED: "Süresi Doldu",
  TRANSFERRING: "Transfer Ediliyor",
};

// Bitişe kalan gün ve uyarı rozeti: 60, 30, 14 ve 7 gün eşikleri
function bitisDurumu(bitis: Date | null): { metin: string; renk: RozetRengi; gun: number | null } {
  if (!bitis) return { metin: "Tarih yok", renk: "secondary", gun: null };
  const gun = Math.ceil((bitis.getTime() - Date.now()) / GUN_MS);
  if (gun < 0) return { metin: `${Math.abs(gun)} gün önce doldu`, renk: "destructive", gun };
  if (gun <= 7) return { metin: `${gun} gün kaldı`, renk: "destructive", gun };
  if (gun <= 14) return { metin: `${gun} gün kaldı`, renk: "warning", gun };
  if (gun <= 30) return { metin: `${gun} gün kaldı`, renk: "warning", gun };
  if (gun <= 60) return { metin: `${gun} gün kaldı`, renk: "info", gun };
  return { metin: `${gun} gün kaldı`, renk: "success", gun };
}

export default async function AlanAdlariSayfasi() {
  await requirePermission("domains:view");

  const [alanAdlari, hostingler] = await Promise.all([
    prisma.domain.findMany({
      orderBy: [{ expiresAt: { sort: "asc", nulls: "last" } }, { name: "asc" }],
      include: { providerAccount: { select: { label: true, kind: true } } },
    }),
    prisma.serverNode.findMany({
      where: { kind: "HOSTING" },
      orderBy: [{ expiresAt: { sort: "asc", nulls: "last" } }, { name: "asc" }],
      include: { providerAccount: { select: { label: true, kind: true } } },
    }),
  ]);

  const whm = await kayitliWhmHesaplari();

  const simdi = Date.now();
  const otuzGunIcinde = alanAdlari.filter(
    (a) => a.expiresAt && a.expiresAt.getTime() >= simdi && a.expiresAt.getTime() - simdi <= 30 * GUN_MS,
  ).length;
  const suresiDolan = alanAdlari.filter((a) => a.expiresAt && a.expiresAt.getTime() < simdi).length;
  const cloudflareBagli = alanAdlari.filter((a) => a.cloudflareZoneId).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">Altyapı / Alan Adları & Hosting</p>
        <h1 className="text-2xl font-semibold tracking-tight">Alan Adları & Hosting</h1>
        <p className="text-sm text-muted-foreground">
          DomainNameAPI ve Cloudflare hesaplarından eşitlenen alan adları ile elle girilen hosting kayıtları. Veriler
          Sağlayıcı Hesapları ekranındaki "Eşitle" düğmesiyle güncellenir.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Toplam alan adı</CardDescription>
            <CardTitle className="text-2xl">{alanAdlari.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>30 gün içinde bitecek</CardDescription>
            <CardTitle className="text-2xl">{otuzGunIcinde}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Süresi dolmuş</CardDescription>
            <CardTitle className="text-2xl">{suresiDolan}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Cloudflare'e bağlı</CardDescription>
            <CardTitle className="text-2xl">{cloudflareBagli}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alan Adları</CardTitle>
          <CardDescription>{alanAdlari.length} kayıt, bitiş tarihine göre sıralı</CardDescription>
        </CardHeader>
        <CardContent>
          {alanAdlari.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Henüz alan adı yok. Sağlayıcı Hesapları ekranından DomainNameAPI veya Cloudflare hesabını eşitleyin.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alan Adı</TableHead>
                  <TableHead>Kayıt Firması</TableHead>
                  <TableHead>Bitiş Tarihi</TableHead>
                  <TableHead>Kalan Süre</TableHead>
                  <TableHead>Otomatik Yenileme</TableHead>
                  <TableHead>Cloudflare</TableHead>
                  <TableHead>Name Server</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alanAdlari.map((a) => {
                  const b = bitisDurumu(a.expiresAt);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>
                        {a.providerAccount ? (SAGLAYICI_ETIKETLERI[a.providerAccount.kind] ?? a.providerAccount.kind) : "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{a.expiresAt ? formatTarih(a.expiresAt) : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={b.renk}>{b.metin}</Badge>
                      </TableCell>
                      <TableCell>{a.autoRenew ? "Açık" : "Kapalı"}</TableCell>
                      <TableCell>{a.cloudflareZoneId ? "Bağlı" : "-"}</TableCell>
                      <TableCell className="max-w-56 truncate font-mono text-xs" title={a.nameservers.join(", ")}>
                        {a.nameservers.length ? a.nameservers.join(", ") : "-"}
                      </TableCell>
                      <TableCell>{DURUM_ETIKETLERI[a.status] ?? a.status}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reseller Hosting Hesapları (WHM)</CardTitle>
          <CardDescription>
            {whm.hesaplar
              ? `${whm.hesaplar.length} hesap, ${whm.hesaplar.filter((h) => h.askida).length} askıda · canlı okunur`
              : "OWeb reseller hosting sunucusundaki hesaplar"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {whm.hata ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{whm.hata}</p>
          ) : !whm.hesaplar ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              WHM bağlantısı tanımlı değil. Sunucuda provider-anahtar.sh betiğiyle 5 numaralı seçeneği çalıştırın.
            </p>
          ) : whm.hesaplar.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Reseller hesabında hosting hesabı yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alan Adı</TableHead>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Paket</TableHead>
                  <TableHead className="text-right">Disk Kullanımı</TableHead>
                  <TableHead>Oluşturma</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {whm.hesaplar.map((h) => (
                  <TableRow key={h.kullanici}>
                    <TableCell className="font-medium">{h.alanAdi}</TableCell>
                    <TableCell className="font-mono text-xs">{h.kullanici}</TableCell>
                    <TableCell>{h.paket}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {formatSayi(h.diskKullanilanMb)} MB / {h.diskLimitMb == null ? "Sınırsız" : `${formatSayi(h.diskLimitMb)} MB`}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{h.olusturma ? formatTarih(h.olusturma) : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={h.askida ? "destructive" : "success"} title={h.askiNedeni ?? undefined}>
                        {h.askida ? "Askıda" : "Aktif"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hosting Kayıtları</CardTitle>
          <CardDescription>Natro ve benzeri firmalardaki hosting hizmetleri (elle giriş)</CardDescription>
        </CardHeader>
        <CardContent>
          {hostingler.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Henüz hosting kaydı girilmedi.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead>Sağlayıcı</TableHead>
                  <TableHead>Bitiş Tarihi</TableHead>
                  <TableHead>Kalan Süre</TableHead>
                  <TableHead className="text-right">Aylık Maliyet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hostingler.map((h) => {
                  const b = bitisDurumu(h.expiresAt);
                  return (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{h.name}</TableCell>
                      <TableCell>
                        {h.providerAccount ? (SAGLAYICI_ETIKETLERI[h.providerAccount.kind] ?? h.providerAccount.kind) : "Elle girildi"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{h.expiresAt ? formatTarih(h.expiresAt) : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={b.renk}>{b.metin}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{h.monthlyCost != null ? h.monthlyCost.toFixed(2) : "-"}</TableCell>
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
