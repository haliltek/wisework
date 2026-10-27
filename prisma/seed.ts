// Türkçe örnek (demo) verisi. Çalıştırmak için: npm run db:seed
// Dolu veritabanında varsayılan olarak hiçbir şey yapmaz; sıfırlamak için SEED_RESET=true verin.

import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calculateSaleSplit } from "../src/lib/finance";
import { generateLicenseKey } from "../src/lib/license";

const prisma = new PrismaClient();

function rastgeleSifre() {
  return randomBytes(9).toString("base64url");
}

function gunOnce(gun: number) {
  const d = new Date();
  d.setDate(d.getDate() - gun);
  return d;
}

function gunSonra(gun: number) {
  return gunOnce(-gun);
}

function saatOnce(saat: number) {
  return new Date(Date.now() - saat * 3600 * 1000);
}

async function main() {
  const doluMu = (await prisma.user.count()) > 0;
  if (doluMu && process.env.SEED_RESET !== "true") {
    console.log("Veritabanı dolu; örnek veri atlandı. Sıfırlamak için SEED_RESET=true kullanın.");
    return;
  }

  if (doluMu) {
    console.log("SEED_RESET=true: mevcut veriler siliniyor...");
    await prisma.$transaction([
      // Bağımlılık sırası: önce alt kayıtlar silinir
      prisma.deployment.deleteMany(),
      prisma.projectEnvironment.deleteMany(),
      prisma.domain.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.ticket.deleteMany(),
      prisma.license.deleteMany(),
      prisma.saasTenant.deleteMany(),
      prisma.sale.deleteMany(),
      prisma.customer.deleteMany(),
      prisma.project.deleteMany(),
      prisma.sector.deleteMany(),
      prisma.serverNode.deleteMany(),
      prisma.providerAccount.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  }

  // ---------- Kullanıcılar ----------
  const adminSifre = process.env.SEED_ADMIN_PASSWORD || rastgeleSifre();
  const bayiSifre = process.env.SEED_PARTNER_PASSWORD || rastgeleSifre();
  const adminSifreUretildi = !process.env.SEED_ADMIN_PASSWORD;
  const bayiSifreUretildi = !process.env.SEED_PARTNER_PASSWORD;

  const adminHash = await bcrypt.hash(adminSifre, 12);
  const bayiHash = await bcrypt.hash(bayiSifre, 12);

  const adminEposta = (process.env.SEED_ADMIN_EMAIL || "admin@example.com").toLowerCase();

  await prisma.user.create({
    data: {
      name: "Sistem Yöneticisi",
      companyName: "Wise Software",
      email: adminEposta,
      passwordHash: adminHash,
      role: "SUPER_ADMIN",
      commissionRate: 0,
    },
  });

  const bayiTanimlari = [
    { ad: "Mert Kaya", firma: "Kaya Bilişim", eposta: "mert@bayi.example.com", oran: 25, telefon: "0500 000 00 11" },
    { ad: "Elif Demir", firma: "Demir Teknoloji", eposta: "elif@bayi.example.com", oran: 30, telefon: "0500 000 00 12" },
    { ad: "Burak Şahin", firma: "Şahin Yazılım", eposta: "burak@bayi.example.com", oran: 20, telefon: "0500 000 00 13" },
  ];

  const bayiler = [];
  for (const b of bayiTanimlari) {
    bayiler.push(
      await prisma.user.create({
        data: {
          name: b.ad,
          companyName: b.firma,
          email: b.eposta,
          phone: b.telefon,
          passwordHash: bayiHash,
          role: "PARTNER",
          commissionRate: b.oran,
        },
      }),
    );
  }
  const [mert, elif, burak] = bayiler;

  // Dahili personel (Geliştirici, Muhasebe, Destek)
  const personelSifre = process.env.SEED_STAFF_PASSWORD || rastgeleSifre();
  const personelSifreUretildi = !process.env.SEED_STAFF_PASSWORD;
  const personelHash = await bcrypt.hash(personelSifre, 12);
  const personelTanimlari = [
    { ad: "Deniz Yıldız", eposta: "gelistirici@example.com", rol: "DEVELOPER" as const, etiket: "Geliştirici" },
    { ad: "Selma Aksoy", eposta: "muhasebe@example.com", rol: "ACCOUNTING" as const, etiket: "Muhasebe" },
    { ad: "Kerem Uslu", eposta: "destek@example.com", rol: "SUPPORT" as const, etiket: "Destek" },
  ];
  for (const p of personelTanimlari) {
    await prisma.user.create({
      data: {
        name: p.ad,
        companyName: "Wise Software",
        email: p.eposta,
        passwordHash: personelHash,
        role: p.rol,
        commissionRate: 0,
      },
    });
  }

  // ---------- Sektörler ----------
  const sektorTanimlari = [
    { name: "E-Ticaret", slug: "e-ticaret" },
    { name: "ERP & Ön Muhasebe", slug: "erp-on-muhasebe" },
    { name: "Sağlık & Klinik", slug: "saglik-klinik" },
    { name: "Restoran/POS", slug: "restoran-pos" },
    { name: "Lojistik", slug: "lojistik" },
    { name: "Mobil Uygulamalar", slug: "mobil-uygulamalar" },
  ];
  const sektor: Record<string, string> = {};
  for (const s of sektorTanimlari) {
    sektor[s.slug] = (await prisma.sector.create({ data: s })).id;
  }

  // ---------- Projeler ----------
  const ortakEnv =
    "DATABASE_URL=postgresql://kullanici:sifre@db:5432/uygulama\nAUTH_SECRET=<openssl rand -base64 32>\nNODE_ENV=production";
  const ortakKurulum =
    "1. Depoyu klonlayın.\n2. .env.example dosyasını .env olarak kopyalayıp doldurun.\n3. docker compose up -d komutuyla başlatın.\n4. seed.sql dosyasını veritabanına yükleyin.";

  const projeTanimlari = [
    {
      title: "Klinik Yönetim Sistemi",
      slug: "klinik-yonetim",
      type: "SAAS_PLATFORM" as const,
      sektor: "saglik-klinik",
      shortSummary: "Randevu, hasta kaydı, tedavi planı ve ödeme takibini tek ekranda toplayan klinik yazılımı.",
      detailedPitch:
        "Hasta kartı, randevu takvimi, tedavi planı, stok ve kasa takibi tek çatıda. SMS ile randevu hatırlatma, doktor bazlı prim hesaplama ve günlük kasa raporu hazır gelir. Çoklu şube desteği sayesinde zincir klinikler için uygundur.",
      techStack: ["Next.js", "Node.js", "PostgreSQL", "Docker"],
      basePrice: 48000,
      liveDemoUrl: "https://klinik.demo.example.com",
      container: "demo_klinik",
    },
    {
      title: "Hızlı E-Ticaret Altyapısı",
      slug: "hizli-eticaret",
      type: "WEB_SOFTWARE" as const,
      sektor: "e-ticaret",
      shortSummary: "Pazaryeri entegrasyonlu, mobil uyumlu ve hızlı kurulan e-ticaret sitesi.",
      detailedPitch:
        "Ürün, stok, kampanya ve sipariş yönetimi; sanal pos ve kargo entegrasyonları hazırdır. Pazaryeri senkronizasyonu ile tek panelden tüm kanalların satışı yönetilir.",
      techStack: ["Next.js", "Prisma", "PostgreSQL", "Redis"],
      basePrice: 62000,
      liveDemoUrl: "https://eticaret.demo.example.com",
      container: "demo_eticaret",
    },
    {
      title: "Ön Muhasebe & Stok Takip",
      slug: "on-muhasebe",
      type: "DESKTOP_ERP" as const,
      sektor: "erp-on-muhasebe",
      shortSummary: "Cari, fatura, stok ve kasa işlemlerini yöneten ön muhasebe programı.",
      detailedPitch:
        "Alış-satış faturaları, cari hesap ekstreleri, stok hareketleri ve kasa/banka takibi. e-Fatura ve e-Arşiv entegrasyonuna hazır altyapı sunar.",
      techStack: [".NET", "SQL Server", "Electron"],
      basePrice: 29000,
      liveDemoUrl: "https://muhasebe.demo.example.com",
      container: "demo_muhasebe",
    },
    {
      title: "Restoran Adisyon & POS",
      slug: "restoran-pos",
      type: "SAAS_PLATFORM" as const,
      sektor: "restoran-pos",
      shortSummary: "Masa, adisyon, mutfak ekranı ve paket servis takibi yapan bulut tabanlı POS.",
      detailedPitch:
        "Masa planı, adisyon yönetimi, mutfak ekranı, reçete bazlı stok düşümü ve paket servis kurye takibi. İnternet kesilse bile çalışmaya devam eden çevrimdışı mod içerir.",
      techStack: ["Next.js", "Node.js", "PostgreSQL", "WebSocket"],
      basePrice: 36000,
      liveDemoUrl: "https://pos.demo.example.com",
      container: "demo_pos",
    },
    {
      title: "Filo & Lojistik Takip",
      slug: "lojistik-takip",
      type: "WEB_SOFTWARE" as const,
      sektor: "lojistik",
      shortSummary: "Araç, sürücü ve sevkiyat takibini harita üzerinden yapan lojistik paneli.",
      detailedPitch:
        "Canlı araç konumu, rota planlama, teslimat durumu ve yakıt/bakım takibi. Müşteriye SMS ile takip bağlantısı gönderilir.",
      techStack: ["Next.js", "PostGIS", "Docker"],
      basePrice: 85000,
      liveDemoUrl: "https://lojistik.demo.example.com",
      container: "demo_lojistik",
    },
    {
      title: "Saha Satış Mobil Uygulaması",
      slug: "saha-satis-mobil",
      type: "MOBILE_APP" as const,
      sektor: "mobil-uygulamalar",
      shortSummary: "Plasiyerlerin sahada sipariş ve tahsilat aldığı çevrimdışı çalışabilen mobil uygulama.",
      detailedPitch:
        "Müşteri ziyaret planı, sipariş alma, tahsilat ve stok sorgulama. İnternet olmadan çalışır, bağlantı gelince ERP ile eşitlenir.",
      techStack: ["React Native", "Expo", "SQLite"],
      basePrice: 41000,
      liveDemoUrl: null,
      container: null,
      mobil: { appStore: "https://apps.apple.com/tr/app/ornek", playStore: "https://play.google.com/store/apps/details?id=com.ornek.sahasatis", surum: "2.1.0" },
    },
    {
      title: "Randevu Mobil Uygulaması",
      slug: "randevu-mobil",
      type: "MOBILE_APP" as const,
      sektor: "mobil-uygulamalar",
      shortSummary: "Kuaför, klinik ve güzellik salonları için markaya özel randevu uygulaması.",
      detailedPitch:
        "Müşteri kendi telefonundan randevu alır, hatırlatma bildirimi gelir. İşletme logosu ve renkleriyle yayınlanır.",
      techStack: ["Flutter", "Firebase"],
      basePrice: 32000,
      liveDemoUrl: null,
      container: null,
      mobil: { appStore: "https://apps.apple.com/tr/app/ornek2", playStore: "https://play.google.com/store/apps/details?id=com.ornek.randevu", surum: "1.4.2" },
    },
    {
      title: "Bayi Sipariş Portalı (B2B)",
      slug: "b2b-siparis",
      type: "WEB_SOFTWARE" as const,
      sektor: "e-ticaret",
      shortSummary: "Toptancı ve üreticilerin bayilerinden sipariş aldığı kapalı devre B2B portal.",
      detailedPitch:
        "Bayiye özel fiyat listesi, kredi limiti, çek/senet takibi ve ERP entegrasyonu. Bayiler 7/24 sipariş verir, bakiye ve ekstre görür.",
      techStack: ["Next.js", "Prisma", "PostgreSQL"],
      basePrice: 54000,
      liveDemoUrl: "https://b2b.demo.example.com",
      container: "demo_b2b",
    },
  ];

  const proje: Record<string, string> = {};
  for (const p of projeTanimlari) {
    const olusan = await prisma.project.create({
      data: {
        title: p.title,
        slug: p.slug,
        type: p.type,
        sectorId: sektor[p.sektor],
        shortSummary: p.shortSummary,
        detailedPitch: p.detailedPitch,
        techStack: p.techStack,
        basePrice: p.basePrice,
        liveDemoUrl: p.liveDemoUrl,
        demoUsername: p.liveDemoUrl ? "demo@demo.com" : null,
        demoPassword: p.liveDemoUrl ? "Demo1234!" : null,
        demoNotes: p.liveDemoUrl ? "Demo veriler her gece sıfırlanır. Gerçek bilgi girmeyin." : null,
        containerName: p.container,
        sablierGroup: p.container ? p.container.replace("_", "-") : null,
        containerStatus: "SLEEPING",
        appStoreUrl: p.mobil?.appStore,
        playStoreUrl: p.mobil?.playStore,
        latestVersion: p.mobil?.surum ?? "1.0.0",
        githubRepoUrl: `https://github.com/ornek-sirket/${p.slug}`,
        envTemplate: ortakEnv,
        deployGuide: ortakKurulum,
      },
    });
    proje[p.slug] = olusan.id;
  }

  // ---------- Sunucu ----------
  // Çekirdek sayısı varsayımdır; ADIM 3'te canlı olarak okunacaktır.
  // Sağlayıcı hesapları: anahtar girilene kadar "Elle giriş" modunda, kimlik bilgisi boştur
  const saglayiciTanimlari = [
    { kind: "DIGITALOCEAN", label: "DigitalOcean - Ana Hesap" },
    { kind: "CLOUDFLARE", label: "Cloudflare - Ana Hesap" },
    { kind: "DOMAINNAMEAPI", label: "DomainNameAPI - Bayi Hesabı" },
    { kind: "NATRO", label: "Natro - Hosting ve Alan Adları" },
    { kind: "OPENROUTER", label: "OpenRouter - Yapay Zekâ API" },
    { kind: "GITHUB", label: "GitHub - Organizasyon" },
  ] as const;

  const saglayici: Record<string, string> = {};
  for (const s of saglayiciTanimlari) {
    saglayici[s.kind] = (await prisma.providerAccount.create({ data: s })).id;
  }

  const sunucu = await prisma.serverNode.create({
    data: {
      name: "DigitalOcean Ana Sunucu",
      providerAccountId: saglayici["DIGITALOCEAN"],
      ipAddress: "142.93.104.78",
      cpuCores: 2,
      ramTotalGb: 3.8,
      diskTotalGb: 77,
    },
  });

  // ---------- Müşteriler ----------
  const musteriTanimlari = [
    { firma: "Akdeniz Diş Kliniği", kisi: "Dr. Selin Aydın", sehir: "Antalya", bayi: mert, alan: "akdenizdis.example.com" },
    { firma: "Lezzet Durağı Restoran", kisi: "Hakan Yılmaz", sehir: "Muğla", bayi: mert, alan: "lezzetduragi.example.com" },
    { firma: "Ege Modern Mobilya", kisi: "Zeynep Koç", sehir: "İzmir", bayi: elif, alan: "egemodern.example.com" },
    { firma: "Anadolu Lojistik A.Ş.", kisi: "Murat Çelik", sehir: "Ankara", bayi: elif, alan: "anadolulojistik.example.com" },
    { firma: "Boğaz Market Zinciri", kisi: "Ayşe Polat", sehir: "İstanbul", bayi: burak, alan: "bogazmarket.example.com" },
    { firma: "Marmaris Otel İşletmeleri", kisi: "Cem Arslan", sehir: "Muğla", bayi: burak, alan: "marmarisotel.example.com" },
  ];

  const musteriler = [];
  let sira = 1;
  for (const m of musteriTanimlari) {
    musteriler.push({
      ...m,
      kayit: await prisma.customer.create({
        data: {
          companyName: m.firma,
          contactName: m.kisi,
          phone: `0500 000 00 ${String(20 + sira).padStart(2, "0")}`,
          email: `iletisim${sira}@musteri.example.com`,
          city: m.sehir,
          partnerId: m.bayi.id,
        },
      }),
    });
    sira++;
  }

  // ---------- Satışlar ve lisanslar ----------
  // [proje, müşteri sırası, durum, kaç gün önce]
  const satisTanimlari: [string, number, string, number][] = [
    ["klinik-yonetim", 0, "TAMAMLANDI", 150],
    ["restoran-pos", 1, "TAMAMLANDI", 120],
    ["hizli-eticaret", 2, "TAMAMLANDI", 95],
    ["lojistik-takip", 3, "TAMAMLANDI", 70],
    ["on-muhasebe", 4, "TAMAMLANDI", 55],
    ["saha-satis-mobil", 4, "TAMAMLANDI", 40],
    ["restoran-pos", 5, "TAMAMLANDI", 25],
    ["b2b-siparis", 2, "KURULUM_BEKLIYOR", 12],
    ["randevu-mobil", 0, "KURULUM_BEKLIYOR", 6],
    ["hizli-eticaret", 1, "DEMO_ASAMASI", 3],
    ["on-muhasebe", 3, "IPTAL", 45],
  ];

  const fiyatlar = new Map(projeTanimlari.map((p) => [p.slug, p.basePrice]));

  for (const [slug, musteriSirasi, durum, gun] of satisTanimlari) {
    const musteri = musteriler[musteriSirasi];
    const fiyat = fiyatlar.get(slug) ?? 0;
    const { partnerCommission, netCompanyRevenue } = calculateSaleSplit(fiyat, musteri.bayi.commissionRate);

    await prisma.sale.create({
      data: {
        projectId: proje[slug],
        customerId: musteri.kayit.id,
        partnerId: musteri.bayi.id,
        salePrice: fiyat,
        partnerCommission,
        netCompanyRevenue,
        status: durum,
        createdAt: gunOnce(gun),
      },
    });

    // Tamamlanan her satış için lisans üretilir.
    // Marmaris Otel (restoran-pos) ödeme beklediği için askıya alınmıştır.
    if (durum === "TAMAMLANDI") {
      const askida = slug === "restoran-pos" && musteriSirasi === 5;
      await prisma.license.create({
        data: {
          licenseKey: generateLicenseKey(),
          projectId: proje[slug],
          customerId: musteri.kayit.id,
          allowedDomain: musteri.alan,
          allowedIp: null,
          appBundleId: slug.endsWith("-mobil") ? `com.ornek.${slug.replace(/-/g, "")}` : null,
          status: askida ? "SUSPENDED" : "ACTIVE",
          expiresAt: gunSonra(365 - gun),
          lastPingAt: askida ? gunOnce(2) : saatOnce(1 + (gun % 6)),
          lastPingIp: "203.0.113." + (10 + gun),
          createdAt: gunOnce(gun),
        },
      });
    }
  }

  // ---------- SaaS kiracıları ----------
  const kiraciTanimlari = [
    { ad: "Akdeniz Diş Kliniği", alt: "akdenizdis", proje: "klinik-yonetim", musteri: 0, ucret: 1450, durum: "RUNNING" as const },
    { ad: "Lezzet Durağı", alt: "lezzetduragi", proje: "restoran-pos", musteri: 1, ucret: 990, durum: "RUNNING" as const },
    { ad: "Marmaris Otel", alt: "marmarisotel", proje: "restoran-pos", musteri: 5, ucret: 990, durum: "STOPPED" as const },
  ];

  for (const k of kiraciTanimlari) {
    await prisma.saasTenant.create({
      data: {
        tenantName: k.ad,
        subdomain: `${k.alt}.saas.example.com`,
        projectId: proje[k.proje],
        customerId: musteriler[k.musteri].kayit.id,
        serverId: sunucu.id,
        dbName: `tenant_${k.alt}`,
        planName: "Profesyonel Paket",
        monthlyFee: k.ucret,
        status: k.durum,
        nextBillingDate: gunSonra(12),
      },
    });
  }

  // ---------- Destek talepleri ----------
  await prisma.ticket.createMany({
    data: [
      {
        subject: "Kurulum tarihi hakkında",
        message: "Ege Modern Mobilya için B2B portal kurulumu hangi gün yapılabilir?",
        status: "ACIK",
        priority: "NORMAL",
        userId: elif.id,
      },
      {
        subject: "Demo girişinde hata alıyorum",
        message: "Klinik demosunda giriş yaparken 'oturum süresi doldu' uyarısı çıkıyor.",
        status: "ISLEMDE",
        priority: "ACIL",
        userId: mert.id,
      },
      {
        subject: "Fatura bilgisi güncelleme",
        message: "Şahin Yazılım unvan değişikliği için hakediş faturası bilgilerini güncelledi.",
        status: "COZULDU",
        priority: "DUSUK",
        userId: burak.id,
      },
      {
        subject: "Yeni bayi komisyon oranı",
        message: "Yıllık hedefe ulaşan bayiler için komisyon oranı artışı mümkün mü?",
        status: "ACIK",
        priority: "NORMAL",
        userId: mert.id,
      },
    ],
  });

  // ---------- Özet ----------
  console.log("\nÖrnek veri yüklendi.\n");
  console.log("Giriş bilgileri (bu şifreler yalnızca şimdi gösterilir, güvenli bir yere kaydedin):");
  console.table([
    { rol: "Yönetici", eposta: adminEposta, sifre: adminSifreUretildi ? adminSifre : "(SEED_ADMIN_PASSWORD)" },
    ...personelTanimlari.map((p) => ({
      rol: p.etiket,
      eposta: p.eposta,
      sifre: personelSifreUretildi ? personelSifre : "(SEED_STAFF_PASSWORD)",
    })),
    ...bayiTanimlari.map((b) => ({
      rol: "Ara Bayi",
      eposta: b.eposta,
      sifre: bayiSifreUretildi ? bayiSifre : "(SEED_PARTNER_PASSWORD)",
    })),
  ]);
}

main()
  .catch((hata) => {
    console.error("Örnek veri yüklenirken hata oluştu:", hata);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
