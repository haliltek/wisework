import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

// cPanel/WHM (reseller) API 1. Kimlik: "Authorization: whm kullanıcı:token", port 2087.
// Yalnızca okuma yapılır (listaccts). TLS doğrulaması AÇIKTIR; sertifika geçersizse hata verilir.
// Kimlik JSON olarak şifreli saklanır: {"host","user","token"}.
export const WHM_HESAP_ID = "whm-oweb";

interface WhmKimlik {
  host: string;
  user: string;
  token: string;
}

interface HamHesap {
  user: string;
  domain: string;
  plan: string;
  diskused?: string;
  disklimit?: string | number;
  suspended?: number;
  suspendreason?: string;
  unix_startdate?: number;
  email?: string;
}

export interface WhmHesabi {
  kullanici: string;
  alanAdi: string;
  paket: string;
  diskKullanilanMb: number;
  diskLimitMb: number | null; // null: sınırsız
  askida: boolean;
  askiNedeni: string | null;
  olusturma: Date | null;
  eposta: string | null;
}

function kimlikCoz(duz: string): WhmKimlik {
  const k = JSON.parse(duz) as Partial<WhmKimlik>;
  if (!k.host || !k.user || !k.token) throw new Error("WHM kimliği eksik (adres, kullanıcı ve token gerekir).");
  // Adres yalnızca ana makine adı olabilir (SSRF'e karşı): harf, rakam, nokta ve tire
  if (!/^[A-Za-z0-9.-]+$/.test(k.host)) throw new Error("WHM adresi geçersiz.");
  return { host: k.host, user: k.user, token: k.token };
}

function mbOku(deger: string | number | undefined): number | null {
  if (deger == null || deger === "unlimited" || deger === "") return null;
  const sayi = parseFloat(String(deger));
  return Number.isNaN(sayi) ? null : sayi;
}

export async function whmHesaplariListele(duzKimlik: string): Promise<WhmHesabi[]> {
  const k = kimlikCoz(duzKimlik);
  const yanit = await fetch(`https://${k.host}:2087/json-api/listaccts?api.version=1`, {
    headers: { Authorization: `whm ${k.user}:${k.token}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (yanit.status === 401 || yanit.status === 403) {
    throw new Error("WHM kimliği reddedildi. Kullanıcı adını, token'ı ve IP iznini kontrol edin.");
  }
  if (!yanit.ok) throw new Error(`WHM ${yanit.status} durum kodu döndürdü.`);

  const govde = (await yanit.json()) as {
    data?: { acct?: HamHesap[] };
    metadata?: { result?: number; reason?: string };
  };
  if (govde.metadata?.result === 0) throw new Error(`WHM hatası: ${govde.metadata.reason ?? "bilinmiyor"}`);

  return (govde.data?.acct ?? []).map((h) => ({
    kullanici: h.user,
    alanAdi: h.domain,
    paket: h.plan,
    diskKullanilanMb: mbOku(h.diskused) ?? 0,
    diskLimitMb: mbOku(h.disklimit),
    askida: h.suspended === 1,
    askiNedeni: h.suspendreason && h.suspendreason !== "not suspended" ? String(h.suspendreason) : null,
    olusturma: h.unix_startdate ? new Date(h.unix_startdate * 1000) : null,
    eposta: h.email || null,
  }));
}

// "Eşitle" düğmesi: bağlantıyı sınar ve özet yazar (hesaplar veritabanına kopyalanmaz, canlı okunur)
export async function whmEsitle(_hesapId: string, duzKimlik: string): Promise<string> {
  const hesaplar = await whmHesaplariListele(duzKimlik);
  const askida = hesaplar.filter((h) => h.askida).length;
  return `${hesaplar.length} hosting hesabı, ${askida} askıda`;
}

// Sayfalar için: kayıtlı WHM hesabını okur. Anahtar yoksa null, hata olursa hata mesajı döner.
export async function kayitliWhmHesaplari(): Promise<{ hesaplar: WhmHesabi[] | null; hata: string | null }> {
  const kayit = await prisma.providerAccount.findUnique({ where: { id: WHM_HESAP_ID } });
  if (!kayit?.credentials) return { hesaplar: null, hata: null };
  try {
    return { hesaplar: await whmHesaplariListele(decryptSecret(kayit.credentials)), hata: null };
  } catch (hata) {
    const mesaj = hata instanceof Error ? hata.message : "Bilinmeyen hata.";
    return { hesaplar: null, hata: mesaj.includes("fetch failed") ? "WHM sunucusuna ulaşılamadı (adres, port 2087 veya IP izni)." : mesaj };
  }
}
