import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OtomatikYenile } from "@/components/projeler/otomatik-yenile";
import { DagitFormu } from "@/components/projeler/dagit-formu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTarihSaat } from "@/lib/format";
import {
  githubToken,
  repoCoz,
  sonCommitler,
  sonSurum,
  type CommitOzeti,
} from "@/lib/github";
import { DAGITIM_DURUMLARI, ORTAM_ETIKETLERI, PROJE_TURLERI } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { requirePermission } from "@/lib/session";
import { dagitAction, dagitimDurumunuYenile, depoBaglaAction, ortamEkleAction } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Proje: ${slug}` };
}

const SECIM_SINIFI =
  "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Ortamın sağlık adresine kısa bir istek atar: 2xx/3xx sağlıklı, diğerleri sorunlu
async function saglikKontrol(url: string | null): Promise<"saglikli" | "sorunlu" | "tanimsiz"> {
  if (!url) return "tanimsiz";
  try {
    const yanit = await fetch(url, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(4000) });
    return yanit.status < 400 ? "saglikli" : "sorunlu";
  } catch {
    return "sorunlu";
  }
}

export default async function ProjeDetaySayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ hata?: string; ok?: string }>;
}) {
  const kullanici = await requirePermission("projects:view");
  const { slug } = await params;
  const { hata, ok } = await searchParams;

  const proje = await prisma.project.findUnique({
    where: { slug },
    include: {
      sector: { select: { name: true } },
      environments: {
        orderBy: { name: "asc" },
        include: { server: { select: { name: true } }, domain: { select: { name: true } } },
      },
    },
  });
  if (!proje) notFound();

  const yonetebilir = hasPermission(kullanici.role, "projects:manage");
  const dagitabilir = hasPermission(kullanici.role, "deploy:run");
  const depoGorebilir = hasPermission(kullanici.role, "code:view");
  const depo = repoCoz(proje.githubRepoUrl);

  const [dagitimlar, sunucular, alanAdlari, saglik] = await Promise.all([
    prisma.deployment.findMany({
      where: { environment: { projectId: proje.id } },
      orderBy: { startedAt: "desc" },
      take: 15,
      include: { environment: { select: { name: true } }, triggeredBy: { select: { name: true, email: true } } },
    }),
    yonetebilir ? prisma.serverNode.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
    yonetebilir ? prisma.domain.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
    Promise.all(proje.environments.map((o) => saglikKontrol(o.healthUrl))),
  ]);

  // GitHub bilgileri yalnızca depo kasasına erişimi olanlara gösterilir
  let commitler: CommitOzeti[] = [];
  let surum: Awaited<ReturnType<typeof sonSurum>> = null;
  let githubHatasi: string | null = null;
  if (depo && depoGorebilir) {
    try {
      const token = await githubToken();
      const dal = proje.environments[0]?.branch ?? "main";
      [commitler, surum] = await Promise.all([sonCommitler(depo.owner, depo.repo, dal, token), sonSurum(depo.owner, depo.repo, token)]);
    } catch (h) {
      githubHatasi = h instanceof Error ? h.message : "GitHub bilgisi alınamadı.";
    }
  }

  const aktifVar = dagitimlar.some((d) => d.status === "QUEUED" || d.status === "RUNNING");
  const aktifOrtamlar = new Set(dagitimlar.filter((d) => d.status === "QUEUED" || d.status === "RUNNING").map((d) => d.environmentId));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link href="/panel/projeler" className="hover:underline">
            Projeler
          </Link>{" "}
          / {proje.title}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{proje.title}</h1>
        <p className="text-sm text-muted-foreground">{proje.shortSummary}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge variant="secondary">{PROJE_TURLERI[proje.type] ?? proje.type}</Badge>
          <Badge variant="outline">{proje.sector.name}</Badge>
          {proje.techStack.map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
        </div>
      </div>

      {hata ? <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{hata}</p> : null}
      {ok ? <p className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">{ok}</p> : null}
      <OtomatikYenile slug={slug} aktif={aktifVar} yenile={dagitimDurumunuYenile} />

      <Card>
        <CardHeader>
          <CardTitle>Ortamlar</CardTitle>
          <CardDescription>Dağıt düğmesi, ortamın dalı için GitHub Actions iş akışını tetikler.</CardDescription>
        </CardHeader>
        <CardContent>
          {proje.environments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Bu projede henüz ortam yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ortam</TableHead>
                  <TableHead>Sunucu</TableHead>
                  <TableHead>Alan Adı</TableHead>
                  <TableHead>Dal / İş Akışı</TableHead>
                  <TableHead>Sürüm</TableHead>
                  <TableHead>Son Dağıtım</TableHead>
                  <TableHead>Sağlık</TableHead>
                  {dagitabilir ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {proje.environments.map((o, i) => {
                  const d = o.lastDeployStatus ? DAGITIM_DURUMLARI[o.lastDeployStatus] : null;
                  const s = saglik[i];
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{ORTAM_ETIKETLERI[o.name] ?? o.name}</TableCell>
                      <TableCell>{o.server.name}</TableCell>
                      <TableCell>{o.domain?.name ?? "-"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {o.branch} · {o.workflowFile}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{o.currentVersion ?? "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {d ? <Badge variant={d.renk}>{d.etiket}</Badge> : <span className="text-xs text-muted-foreground">Hiç dağıtılmadı</span>}
                        {o.lastDeployAt ? (
                          <span className="block text-xs text-muted-foreground">{formatTarihSaat(o.lastDeployAt)}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {s === "saglikli" ? (
                          <Badge variant="success">Sağlıklı</Badge>
                        ) : s === "sorunlu" ? (
                          <Badge variant="destructive">Yanıt vermiyor</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Adres yok</span>
                        )}
                      </TableCell>
                      {dagitabilir ? (
                        <TableCell className="text-right">
                          <DagitFormu
                            ortamId={o.id}
                            ortamAdi={ORTAM_ETIKETLERI[o.name] ?? o.name}
                            action={dagitAction}
                            devamEdiyor={aktifOrtamlar.has(o.id)}
                          />
                        </TableCell>
                      ) : null}
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
          <CardTitle>Dağıtım Geçmişi</CardTitle>
          <CardDescription>Son 15 dağıtım</CardDescription>
        </CardHeader>
        <CardContent>
          {dagitimlar.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Henüz dağıtım yapılmadı.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Başlangıç</TableHead>
                  <TableHead>Ortam</TableHead>
                  <TableHead>Dal</TableHead>
                  <TableHead>Başlatan</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Bitiş</TableHead>
                  <TableHead>Günlük</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dagitimlar.map((d) => {
                  const durum = DAGITIM_DURUMLARI[d.status];
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="whitespace-nowrap">{formatTarihSaat(d.startedAt)}</TableCell>
                      <TableCell>{ORTAM_ETIKETLERI[d.environment.name] ?? d.environment.name}</TableCell>
                      <TableCell className="font-mono text-xs">{d.ref}</TableCell>
                      <TableCell>{d.triggeredBy?.name ?? d.triggeredBy?.email ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={durum.renk}>{durum.etiket}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{d.finishedAt ? formatTarihSaat(d.finishedAt) : "-"}</TableCell>
                      <TableCell>
                        {d.runUrl && depoGorebilir ? (
                          <a href={d.runUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            GitHub'da aç
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {depoGorebilir ? (
        <Card>
          <CardHeader>
            <CardTitle>Depo ve GitHub</CardTitle>
            <CardDescription>{depo ? `${depo.owner}/${depo.repo}` : "Bu projeye henüz depo bağlanmadı."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {githubHatasi ? <p className="text-sm text-muted-foreground">{githubHatasi}</p> : null}
            {depo && !githubHatasi ? (
              <>
                <p className="text-sm">
                  Son sürüm:{" "}
                  {surum ? (
                    <a href={surum.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {surum.etiket}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">yayınlanmış sürüm yok</span>
                  )}
                </p>
                {commitler.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Commit</TableHead>
                        <TableHead>Açıklama</TableHead>
                        <TableHead>Yazar</TableHead>
                        <TableHead>Tarih</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commitler.map((c) => (
                        <TableRow key={c.sha}>
                          <TableCell className="font-mono text-xs">
                            <a href={c.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              {c.sha}
                            </a>
                          </TableCell>
                          <TableCell className="max-w-96 truncate">{c.mesaj}</TableCell>
                          <TableCell>{c.yazar}</TableCell>
                          <TableCell className="whitespace-nowrap">{c.tarih ? formatTarihSaat(c.tarih) : "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
              </>
            ) : null}
            {yonetebilir ? (
              <form action={depoBaglaAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="projeId" value={proje.id} />
                <div className="min-w-72 flex-1 space-y-1.5">
                  <Label htmlFor="depoUrl">{depo ? "Depoyu değiştir" : "GitHub deposu"}</Label>
                  <Input id="depoUrl" name="depoUrl" placeholder="https://github.com/sahip/depo" required />
                </div>
                <Button type="submit" variant="outline">
                  {depo ? "Güncelle" : "Depoyu bağla"}
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {yonetebilir ? (
        <Card>
          <CardHeader>
            <CardTitle>Ortam Ekle</CardTitle>
            <CardDescription>Her projede bir Üretim ve bir Hazırlık ortamı olabilir.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={ortamEkleAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <input type="hidden" name="projeId" value={proje.id} />
              <div className="space-y-1.5">
                <Label htmlFor="ad">Ortam</Label>
                <select id="ad" name="ad" className={SECIM_SINIFI} defaultValue="production">
                  <option value="production">Üretim</option>
                  <option value="staging">Hazırlık</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sunucuId">Sunucu</Label>
                <select id="sunucuId" name="sunucuId" className={SECIM_SINIFI} required>
                  {sunucular.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="alanAdiId">Alan adı (isteğe bağlı)</Label>
                <select id="alanAdiId" name="alanAdiId" className={SECIM_SINIFI} defaultValue="">
                  <option value="">Yok</option>
                  {alanAdlari.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dal">Dal</Label>
                <Input id="dal" name="dal" defaultValue="main" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="isAkisi">İş akışı dosyası</Label>
                <Input id="isAkisi" name="isAkisi" defaultValue="deploy.yml" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="saglikUrl">Sağlık adresi (isteğe bağlı)</Label>
                <Input id="saglikUrl" name="saglikUrl" placeholder="http://142.93.104.78:8097/api/saglik" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="konteyner">Konteyner adı (isteğe bağlı)</Label>
                <Input id="konteyner" name="konteyner" placeholder="wise-app" />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Button type="submit">Ortamı ekle</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
