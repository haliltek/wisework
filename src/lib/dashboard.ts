import { prisma } from "@/lib/prisma";

const GRAFIK_AY_SAYISI = 6;

const ayAdi = new Intl.DateTimeFormat("tr-TR", { month: "short", timeZone: "Europe/Istanbul" });

// Son N ayın başlangıç tarihleri (eskiden yeniye)
function sonAylar(adet: number) {
  const simdi = new Date();
  return Array.from({ length: adet }, (_, i) => {
    const sira = adet - 1 - i;
    return new Date(simdi.getFullYear(), simdi.getMonth() - sira, 1);
  });
}

function aylikToplam(satislar: { salePrice: number; createdAt: Date }[]) {
  return sonAylar(GRAFIK_AY_SAYISI).map((baslangic) => {
    const toplam = satislar
      .filter(
        (s) =>
          s.createdAt.getFullYear() === baslangic.getFullYear() &&
          s.createdAt.getMonth() === baslangic.getMonth(),
      )
      .reduce((t, s) => t + s.salePrice, 0);
    return { ay: ayAdi.format(baslangic), ciro: Math.round(toplam) };
  });
}

// Yönetici paneli verileri.
// "Aktif SaaS" ve MRR yalnızca RUNNING durumundaki kiracıları sayar.
// "Toplam ciro" yalnızca TAMAMLANDI durumundaki satışları sayar.
export async function getAdminOverview() {
  const baslangic = sonAylar(GRAFIK_AY_SAYISI)[0];

  const [mrr, ciro, aktifSaas, aktifLisans, askidaLisans, grafikSatislari, sonSatislar] =
    await Promise.all([
      prisma.saasTenant.aggregate({ _sum: { monthlyFee: true }, where: { status: "RUNNING" } }),
      prisma.sale.aggregate({
        _sum: { salePrice: true, netCompanyRevenue: true },
        where: { status: "TAMAMLANDI" },
      }),
      prisma.saasTenant.count({ where: { status: "RUNNING" } }),
      prisma.license.count({ where: { status: "ACTIVE" } }),
      prisma.license.count({ where: { status: "SUSPENDED" } }),
      prisma.sale.findMany({
        where: { status: "TAMAMLANDI", createdAt: { gte: baslangic } },
        select: { salePrice: true, createdAt: true },
      }),
      prisma.sale.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          project: { select: { title: true } },
          customer: { select: { companyName: true } },
          partner: { select: { name: true, companyName: true } },
        },
      }),
    ]);

  return {
    mrr: mrr._sum.monthlyFee ?? 0,
    toplamCiro: ciro._sum.salePrice ?? 0,
    netGelir: ciro._sum.netCompanyRevenue ?? 0,
    aktifSaas,
    aktifLisans,
    askidaLisans,
    aylikCiro: aylikToplam(grafikSatislari),
    sonSatislar,
  };
}

// Bayi paneli verileri (yalnızca bayinin kendi kayıtları).
// "Bekleyen ödeme": kurulumu henüz tamamlanmamış ama iptal edilmemiş satışların hakedişi.
export async function getPartnerOverview(partnerId: string) {
  const [tamamlanan, bekleyen, sonSatislar] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { salePrice: true, partnerCommission: true },
      where: { partnerId, status: "TAMAMLANDI" },
    }),
    prisma.sale.aggregate({
      _sum: { partnerCommission: true },
      where: { partnerId, status: "KURULUM_BEKLIYOR" },
    }),
    prisma.sale.findMany({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        project: { select: { title: true } },
        customer: { select: { companyName: true } },
      },
    }),
  ]);

  return {
    toplamSatis: tamamlanan._sum.salePrice ?? 0,
    kazanilanHakedis: tamamlanan._sum.partnerCommission ?? 0,
    bekleyenOdeme: bekleyen._sum.partnerCommission ?? 0,
    sonSatislar,
  };
}
