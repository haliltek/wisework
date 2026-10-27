import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTL } from "@/lib/format";
import { PROJE_TURLERI } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Ürün & Demo Vitrini" };
export const dynamic = "force-dynamic";

const CIP = "rounded-md border px-3 py-1.5 text-sm";
const CIP_AKTIF = `${CIP} border-primary bg-primary text-primary-foreground`;
const CIP_PASIF = `${CIP} border-input bg-card hover:bg-accent`;

export default async function VitrinSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ sektor?: string; sunum?: string }>;
}) {
  await requirePermission("showcase:view");
  const { sektor, sunum } = await searchParams;
  const sunumModu = sunum === "1";

  const [sektorler, projeler] = await Promise.all([
    prisma.sector.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { projects: { where: { isPublished: true } } } } },
    }),
    prisma.project.findMany({
      where: { isPublished: true, ...(sektor ? { sector: { slug: sektor } } : {}) },
      orderBy: { title: "asc" },
      include: { sector: { select: { name: true } } },
    }),
  ]);

  // Sunum modu ve sektör filtresi birbirini korur
  const bag = (yeniSektor: string | undefined, yeniSunum: boolean) => {
    const q = new URLSearchParams();
    if (yeniSektor) q.set("sektor", yeniSektor);
    if (yeniSunum) q.set("sunum", "1");
    const metin = q.toString();
    return metin ? `/panel/vitrin?${metin}` : "/panel/vitrin";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Ticari / Ürün & Demo Vitrini</p>
          <h1 className="text-2xl font-semibold tracking-tight">Ürün & Demo Vitrini</h1>
          <p className="text-sm text-muted-foreground">
            Müşterilere sunulan ürünler. {sunumModu ? "Müşteri Sunum Modu açık: fiyat bilgisi gizlendi." : "Fiyat bilgisi görünüyor."}
          </p>
        </div>
        <Link href={bag(sektor, !sunumModu)} className={sunumModu ? CIP_AKTIF : CIP_PASIF}>
          {sunumModu ? "Sunum Modunu Kapat" : "Müşteri Sunum Modu"}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={bag(undefined, sunumModu)} className={!sektor ? CIP_AKTIF : CIP_PASIF}>
          Tümü
        </Link>
        {sektorler
          .filter((s) => s._count.projects > 0)
          .map((s) => (
            <Link key={s.id} href={bag(s.slug, sunumModu)} className={sektor === s.slug ? CIP_AKTIF : CIP_PASIF}>
              {s.name} ({s._count.projects})
            </Link>
          ))}
      </div>

      {projeler.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Vitrinde gösterilecek ürün yok.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projeler.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardDescription>{p.sector.name}</CardDescription>
                <CardTitle>
                  <Link href={`/panel/vitrin/${p.slug}${sunumModu ? "?sunum=1" : ""}`} className="hover:underline">
                    {p.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{p.shortSummary}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">{PROJE_TURLERI[p.type] ?? p.type}</Badge>
                  {p.techStack.slice(0, 4).map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>{sunumModu ? "" : p.basePrice > 0 ? formatTL(p.basePrice) : "Fiyat girilmedi"}</span>
                  <Link href={`/panel/vitrin/${p.slug}${sunumModu ? "?sunum=1" : ""}`} className="text-primary hover:underline">
                    Ayrıntılar
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
