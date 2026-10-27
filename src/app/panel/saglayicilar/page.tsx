import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { esitlenebilirMi } from "@/lib/providers";
import { esitleAction } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTarih } from "@/lib/format";
import { SAGLAYICI_ETIKETLERI } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Sağlayıcı Hesapları" };
export const dynamic = "force-dynamic";

export default async function SaglayicilarSayfasi() {
  await requirePermission("providers:manage");

  const hesaplar = await prisma.providerAccount.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { servers: true, domains: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sağlayıcı Hesapları</h1>
        <p className="text-sm text-muted-foreground">
          DigitalOcean, Cloudflare, DomainNameAPI, Natro, OpenRouter ve GitHub hesapları. Anahtarlar şifreli saklanır
          ve arayüzde yalnızca maskeli ipucu gösterilir. DigitalOcean, Cloudflare ve OpenRouter hesapları "Eşitle" düğmesiyle güncellenir.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hesaplar</CardTitle>
          <CardDescription>{hesaplar.length} kayıt</CardDescription>
        </CardHeader>
        <CardContent>
          {hesaplar.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Henüz sağlayıcı hesabı eklenmedi.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hesap</TableHead>
                  <TableHead>Sağlayıcı</TableHead>
                  <TableHead>Eşitleme</TableHead>
                  <TableHead>Anahtar</TableHead>
                  <TableHead className="text-right">Sunucu</TableHead>
                  <TableHead className="text-right">Alan Adı</TableHead>
                  <TableHead>Son Eşitleme</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Son Sonuç</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {hesaplar.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.label}</TableCell>
                    <TableCell>{SAGLAYICI_ETIKETLERI[h.kind] ?? h.kind}</TableCell>
                    <TableCell>
                      <Badge variant={h.syncMode === "AUTO" ? "info" : "secondary"}>
                        {h.syncMode === "AUTO" ? "Otomatik (API)" : "Elle giriş"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{h.credentialHint ?? "Tanımlı değil"}</TableCell>
                    <TableCell className="text-right">{h._count.servers}</TableCell>
                    <TableCell className="text-right">{h._count.domains}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {h.lastSyncAt ? formatTarih(h.lastSyncAt) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={h.isActive ? "success" : "secondary"}>{h.isActive ? "Aktif" : "Pasif"}</Badge>
                    </TableCell>
                    <TableCell className="max-w-64 text-xs text-muted-foreground">{h.lastSyncStatus ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      {esitlenebilirMi(h.kind) && h.credentials ? (
                        <form action={esitleAction}>
                          <input type="hidden" name="hesapId" value={h.id} />
                          <Button type="submit" variant="outline" size="sm">
                            Eşitle
                          </Button>
                        </form>
                      ) : null}
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
