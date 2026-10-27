import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DAGITIM_DURUMLARI, ORTAM_ETIKETLERI, PROJE_TURLERI } from "@/lib/labels";
import { repoCoz } from "@/lib/github";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { requirePermission } from "@/lib/session";
import { projeEkleAction } from "./actions";

export const metadata: Metadata = { title: "Projeler" };
export const dynamic = "force-dynamic";

const SECIM_SINIFI =
  "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function ProjelerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string; ok?: string }>;
}) {
  const kullanici = await requirePermission("projects:view");
  const { hata, ok } = await searchParams;
  const yonetebilir = hasPermission(kullanici.role, "projects:manage");
  const depoGorebilir = hasPermission(kullanici.role, "code:view");

  const [projeler, sektorler] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "asc" },
      include: { sector: { select: { name: true } }, environments: { orderBy: { name: "asc" } } },
    }),
    yonetebilir ? prisma.sector.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">Altyapı / Projeler</p>
        <h1 className="text-2xl font-semibold tracking-tight">Projeler</h1>
        <p className="text-sm text-muted-foreground">
          Her projenin depo, ortam, sunucu ve dağıtım bilgileri. Bir projeye girerek ortamlarını görebilir ve Dağıt
          düğmesiyle GitHub Actions iş akışını tetikleyebilirsiniz.
        </p>
      </div>

      {hata ? <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{hata}</p> : null}
      {ok ? <p className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">{ok}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Proje Listesi</CardTitle>
          <CardDescription>{projeler.length} proje</CardDescription>
        </CardHeader>
        <CardContent>
          {projeler.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Henüz proje yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proje</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Sektör</TableHead>
                  {depoGorebilir ? <TableHead>Depo</TableHead> : null}
                  <TableHead>Ortamlar</TableHead>
                  <TableHead>Sürüm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projeler.map((p) => {
                  const depo = repoCoz(p.githubRepoUrl);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link href={`/panel/projeler/${p.slug}`} className="font-medium text-primary hover:underline">
                          {p.title}
                        </Link>
                        <span className="block max-w-80 truncate text-xs text-muted-foreground">{p.shortSummary}</span>
                      </TableCell>
                      <TableCell>{PROJE_TURLERI[p.type] ?? p.type}</TableCell>
                      <TableCell>{p.sector.name}</TableCell>
                      {depoGorebilir ? (
                        <TableCell className="font-mono text-xs">{depo ? `${depo.owner}/${depo.repo}` : "-"}</TableCell>
                      ) : null}
                      <TableCell>
                        {p.environments.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Ortam yok</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {p.environments.map((o) => {
                              const d = o.lastDeployStatus ? DAGITIM_DURUMLARI[o.lastDeployStatus] : null;
                              return (
                                <Badge key={o.id} variant={d?.renk ?? "outline"}>
                                  {ORTAM_ETIKETLERI[o.name] ?? o.name}
                                  {d ? `: ${d.etiket}` : ""}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{p.latestVersion ?? "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {yonetebilir ? (
        <Card>
          <CardHeader>
            <CardTitle>Yeni Proje</CardTitle>
            <CardDescription>
              Şirket içi projeler yayında değil olarak açılır ve vitrinde görünmez. Ayrıntıları sonradan tamamlayabilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={projeEkleAction} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="baslik">Proje adı</Label>
                <Input id="baslik" name="baslik" required maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tur">Tür</Label>
                <select id="tur" name="tur" className={SECIM_SINIFI} defaultValue="WEB_SOFTWARE">
                  {Object.entries(PROJE_TURLERI).map(([kod, etiket]) => (
                    <option key={kod} value={kod}>
                      {etiket}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sektorId">Sektör</Label>
                <select id="sektorId" name="sektorId" className={SECIM_SINIFI} required>
                  {sektorler.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="depoUrl">GitHub deposu (isteğe bağlı)</Label>
                <Input id="depoUrl" name="depoUrl" placeholder="https://github.com/sahip/depo" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ozet">Kısa açıklama</Label>
                <Input id="ozet" name="ozet" required maxLength={200} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Projeyi oluştur</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
