import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTarih } from "@/lib/format";
import { ROL_ETIKETLERI } from "@/lib/labels";
import { IZIN_ETIKETLERI } from "@/lib/permission-labels";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, hasPermission, type AppRole } from "@/lib/rbac";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Kullanıcılar & Yetkiler" };
export const dynamic = "force-dynamic";

const ROLLER: AppRole[] = ["SUPER_ADMIN", "DEVELOPER", "ACCOUNTING", "SUPPORT", "PARTNER"];

export default async function KullanicilarSayfasi() {
  await requirePermission("users:manage");

  const kullanicilar = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, companyName: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kullanıcılar & Yetkiler</h1>
        <p className="text-sm text-muted-foreground">
          Hesaplar ve rollerin izin matrisi. Kullanıcı ekleme ve rol değiştirme ADIM 2'de eklenecek.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kullanıcılar</CardTitle>
          <CardDescription>{kullanicilar.length} kayıt</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Son Giriş</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kullanicilar.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell>{k.email}</TableCell>
                  <TableCell>{k.companyName ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={k.role === "SUPER_ADMIN" ? "default" : "secondary"}>
                      {ROL_ETIKETLERI[k.role] ?? k.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={k.isActive ? "success" : "secondary"}>{k.isActive ? "Aktif" : "Pasif"}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {k.lastLoginAt ? formatTarih(k.lastLoginAt) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>İzin Matrisi</CardTitle>
          <CardDescription>Her rolün varsayılan izinleri (salt okunur).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bölüm</TableHead>
                <TableHead>İzin</TableHead>
                {ROLLER.map((r) => (
                  <TableHead key={r} className="text-center">
                    {ROL_ETIKETLERI[r]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSIONS.map((izin) => (
                <TableRow key={izin}>
                  <TableCell className="text-muted-foreground">{IZIN_ETIKETLERI[izin].bolum}</TableCell>
                  <TableCell>{IZIN_ETIKETLERI[izin].etiket}</TableCell>
                  {ROLLER.map((r) => (
                    <TableCell key={r} className="text-center">
                      {hasPermission(r, izin) ? (
                        <span className="text-xs font-medium text-success">Var</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">Yok</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            Bayi (Ara Bayi) rolünün müşteri, satış ve destek izinleri yalnızca kendi kayıtlarını kapsar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
