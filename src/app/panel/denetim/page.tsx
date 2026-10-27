import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Denetim Kayıtları" };
export const dynamic = "force-dynamic";

const zamanBicimi = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Europe/Istanbul",
});

export default async function DenetimSayfasi() {
  await requirePermission("audit:view");

  const kayitlar = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Denetim Kayıtları</h1>
        <p className="text-sm text-muted-foreground">
          Dağıtım, yetki ve kimlik bilgisi değişikliği gibi hassas işlemlerin kaydı.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Son 100 İşlem</CardTitle>
          <CardDescription>En yeni kayıt en üsttedir.</CardDescription>
        </CardHeader>
        <CardContent>
          {kayitlar.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Henüz denetim kaydı yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zaman</TableHead>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>İşlem</TableHead>
                  <TableHead>Nesne</TableHead>
                  <TableHead>Özet</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kayitlar.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="whitespace-nowrap">{zamanBicimi.format(k.createdAt)}</TableCell>
                    <TableCell>{k.user?.name ?? "Sistem"}</TableCell>
                    <TableCell className="font-mono text-xs">{k.action}</TableCell>
                    <TableCell className="text-muted-foreground">{k.entityType}</TableCell>
                    <TableCell>{k.summary}</TableCell>
                    <TableCell className="text-muted-foreground">{k.ip ?? "-"}</TableCell>
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
