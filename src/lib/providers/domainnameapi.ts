import { prisma } from "@/lib/prisma";

// DomainNameAPI REST (resmi nodejs-dna 4.x kaynağından doğrulanan uç noktalar).
// Kimlik: Bayi ID (UUID) + API anahtarı; "X-API-KEY" ve "__reseller" başlıklarıyla gönderilir.
// Hata raporlama/telemetri yoktur ve TLS doğrulaması AÇIKTIR.
const TABAN = "https://api.domainresellerapi.com/api/v1";
const SAYFA_BOYUTU = 200;
const EN_FAZLA_SAYFA = 50;

interface Kimlik {
  resellerId: string;
  apiKey: string;
}

interface HamAlanAdi {
  domainName?: string;
  status?: string | number;
  statusCode?: string | number;
  statusText?: string | number;
  startDate?: string | null;
  expirationDate?: string | null;
  nameServers?: string[];
}

function kimlikCoz(duz: string): Kimlik {
  const k = JSON.parse(duz) as Partial<Kimlik>;
  if (!k.resellerId || !k.apiKey) throw new Error("DomainNameAPI kimliği eksik (Bayi ID ve API anahtarı gerekir).");
  return { resellerId: k.resellerId, apiKey: k.apiKey };
}

async function dnaGet<T>(yol: string, kimlik: Kimlik, parametreler: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${TABAN}/${yol}`);
  for (const [anahtar, deger] of Object.entries(parametreler)) url.searchParams.set(anahtar, String(deger));

  const yanit = await fetch(url, {
    headers: { "X-API-KEY": kimlik.apiKey, __reseller: kimlik.resellerId, Accept: "application/json" },
    cache: "no-store",
    redirect: "manual", // 301/302, API'de geçersiz kimlik anlamına gelir
    signal: AbortSignal.timeout(30000),
  });
  if (yanit.status >= 300 && yanit.status < 400) {
    throw new Error("Kimlik reddedildi. Bayi ID ve API anahtarını kontrol edin.");
  }
  if (yanit.status === 401 || yanit.status === 403) {
    throw new Error("Yetkisiz. Anahtarı ve sunucu IP'sinin (142.93.104.78) izinli listede olduğunu kontrol edin.");
  }
  if (!yanit.ok) throw new Error(`DomainNameAPI ${yanit.status} durum kodu döndürdü.`);
  return (await yanit.json()) as T;
}

function tarih(deger?: string | null): Date | null {
  if (!deger) return null;
  const t = new Date(deger);
  return Number.isNaN(t.getTime()) ? null : t;
}

function durumBelirle(a: HamAlanAdi, bitis: Date | null): "ACTIVE" | "EXPIRED" | "TRANSFERRING" {
  const metin = `${a.statusCode ?? ""} ${a.statusText ?? ""} ${a.status ?? ""}`.toLowerCase();
  if (metin.includes("transfer")) return "TRANSFERRING";
  if (metin.includes("expire") || (bitis && bitis.getTime() < Date.now())) return "EXPIRED";
  return "ACTIVE";
}

// Alan adlarını ve hesap bakiyesini eşitler
export async function domainNameApiEsitle(hesapId: string, duzKimlik: string): Promise<string> {
  const kimlik = kimlikCoz(duzKimlik);

  const hepsi: HamAlanAdi[] = [];
  let toplam = 0;
  for (let sayfa = 0; sayfa < EN_FAZLA_SAYFA; sayfa++) {
    const yanit = await dnaGet<{ items?: HamAlanAdi[]; totalCount?: number }>("domains", kimlik, {
      MaxResultCount: SAYFA_BOYUTU,
      SkipCount: sayfa * SAYFA_BOYUTU,
    });
    const parca = yanit.items ?? [];
    toplam = Number(yanit.totalCount ?? 0);
    hepsi.push(...parca);
    if (parca.length < SAYFA_BOYUTU || hepsi.length >= toplam) break;
  }

  for (const a of hepsi) {
    if (!a.domainName) continue;
    const bitis = tarih(a.expirationDate);
    const alanlar = {
      providerAccountId: hesapId,
      registeredAt: tarih(a.startDate),
      expiresAt: bitis,
      nameservers: a.nameServers ?? [],
      status: durumBelirle(a, bitis),
    };
    await prisma.domain.upsert({
      where: { name: a.domainName.toLowerCase() },
      update: alanlar,
      create: { name: a.domainName.toLowerCase(), ...alanlar },
    });
  }

  let bakiye = "";
  try {
    const b = await dnaGet<{ usdBalance?: number; tryBalance?: number }>("deposit/accounts/me", kimlik);
    bakiye = ` · Bakiye: $${Number(b.usdBalance ?? 0).toFixed(2)} / ${Number(b.tryBalance ?? 0).toFixed(2)} TL`;
  } catch {
    // Bakiye okunamazsa alan adı eşitlemesi yine de başarılı sayılır
  }
  return `${hepsi.length} alan adı eşitlendi${bakiye}`;
}
