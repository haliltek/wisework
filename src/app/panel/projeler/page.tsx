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
import { konteynerGruplari, konteynerleriListele, type KonteynerGrubu } from "@/lib/docker";
import { KONTEYNER_DURUMLARI } from "@/lib/labels";
import { konteynerdenIceAktarAction, projeEkleAction } from "./actions";

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

  // Sunucuda çalışıp henüz projeye dönüşmemiş konteyner grupları (yalnızca okunur)
  let iceAktarilabilir: KonteynerGrubu[] = [];
  let dockerHatasi: string | null = null;
  if (yonetebilir) {
    try {
      const kayitliSluglar = new Set(projeler.map((p) => p.slug));
      const harita: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };
      const slugla = (a: string) =>
        a.toLowerCase().replace(/[çğıöşü]/g, (h) => harita[h] ?? h).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "proje";
      iceAktarilabilir = konteynerGruplari(await konteynerleriListele(false)).filter((g) => !kayitliSluglar.has(slugla(g.anahtar)));
    } catch {
      dockerHatasi = "Docker'a ulaşılamadı; sunucudaki konteynerler listelenemiyor.";
    }
  }

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
            <CardTitle>Sunucudan İçe Aktar</CardTitle>
            <CardDescription>
              Sunucuda çalışan Docker projelerinden henüz panele eklenmemiş olanlar. İçe aktarma yalnızca kayıt oluşturur;
              konteynerlere dokunmaz. Çalışmayan gruplar varsayılan olarak seçili gelmez.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dockerHatasi ? (
              <p className="py-4 text-sm text-muted-foreground">{dockerHatasi}</p>
            ) : iceAktarilabilir.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">İçe aktarılacak yeni konteyner grubu yok.</p>
            ) : (
              <form action={konteynerdenIceAktarAction} className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Grup</TableHead>
                      <TableHead>Konteynerler</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {iceAktarilabilir.map((g) => {
                      const durum = KONTEYNER_DURUMLARI[g.calisan > 0 ? "RUNNING" : "STOPPED"];
                      return (
                        <TableRow key={g.anahtar}>
                          <TableCell>
                            <input type="checkbox" name="grup" value={g.anahtar} defaultChecked={g.calisan > 0} aria-label={`${g.anahtar} grubunu seç`} />
                          </TableCell>
                          <TableCell className="font-medium">{g.anahtar}</TableCell>
                          <TableCell className="max-w-96 truncate text-xs text-muted-foreground" title={g.konteynerler.map((k) => k.ad).join(", ")}>
                            {g.konteynerler.map((k) => k.ad).join(", ")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={durum.renk}>
                              {durum.etiket} ({g.calisan}/{g.konteynerler.length})
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-56 space-y-1.5">
                    <Label htmlFor="iceSektor">Sektör (hepsi için)</Label>
                    <select id="iceSektor" name="sektorId" className={SECIM_SINIFI} required>
                      {sektorler.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit">Seçilenleri içe aktar</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}

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
