import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTL } from "@/lib/format";
import { PROJE_TURLERI } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { requirePermission } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Vitrin: ${slug}` };
}

export default async function VitrinDetaySayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sunum?: string }>;
}) {
  const kullanici = await requirePermission("showcase:view");
  const { slug } = await params;
  const { sunum } = await searchParams;
  const sunumModu = sunum === "1";
  const yonetebilir = hasPermission(kullanici.role, "projects:manage");

  const p = await prisma.project.findUnique({ where: { slug }, include: { sector: { select: { name: true } } } });
  // Yayında olmayan proje yalnızca yöneticilere (önizleme) görünür
  if (!p || (!p.isPublished && !yonetebilir)) notFound();

  const magazaBaglantilari = [
    { etiket: "App Store", url: p.appStoreUrl },
    { etiket: "Google Play", url: p.playStoreUrl },
    { etiket: "APK indir", url: p.apkDownloadUrl },
  ].filter((b) => b.url);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link href={sunumModu ? "/panel/vitrin?sunum=1" : "/panel/vitrin"} className="hover:underline">
            Ürün & Demo Vitrini
          </Link>{" "}
          / {p.title}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{p.title}</h1>
        <p className="text-sm text-muted-foreground">{p.shortSummary}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge variant="secondary">{PROJE_TURLERI[p.type] ?? p.type}</Badge>
          <Badge variant="outline">{p.sector.name}</Badge>
          {!p.isPublished ? <Badge variant="warning">Yayında değil (önizleme)</Badge> : null}
          {p.techStack.map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ürün Özellikleri</CardTitle>
          </CardHeader>
          <CardContent>
            {p.detailedPitch ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{p.detailedPitch}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Ayrıntılı tanıtım henüz girilmedi.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Canlı Demo</CardTitle>
              <CardDescription>Demo veriler gerçek bilgi içermez.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {p.liveDemoUrl ? (
                <>
                  <p>
                    <a href={p.liveDemoUrl} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
                      {p.liveDemoUrl}
                    </a>
                  </p>
                  {p.demoUsername ? (
                    <p>
                      Kullanıcı: <span className="font-mono">{p.demoUsername}</span>
                    </p>
                  ) : null}
                  {p.demoPassword ? (
                    <p>
                      Şifre: <span className="font-mono">{p.demoPassword}</span>
                    </p>
                  ) : null}
                  {p.demoNotes ? <p className="text-muted-foreground">{p.demoNotes}</p> : null}
                </>
              ) : (
                <p className="text-muted-foreground">Bu ürün için canlı demo adresi girilmedi.</p>
              )}
            </CardContent>
          </Card>

          {magazaBaglantilari.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Mobil Uygulama</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {magazaBaglantilari.map((b) => (
                  <p key={b.etiket}>
                    <a href={b.url ?? "#"} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {b.etiket}
                    </a>
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {!sunumModu ? (
            <Card>
              <CardHeader>
                <CardTitle>Liste Fiyatı</CardTitle>
              </CardHeader>
              <CardContent className="text-lg font-semibold">{p.basePrice > 0 ? formatTL(p.basePrice) : "Fiyat girilmedi"}</CardContent>
            </Card>
          ) : null}

          {yonetebilir ? (
            <p className="text-sm">
              <Link href={`/panel/projeler/${p.slug}`} className="text-primary hover:underline">
                Proje sayfasında düzenle
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
