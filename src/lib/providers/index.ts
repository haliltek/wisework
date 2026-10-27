import type { ProviderKind } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { cloudflareEsitle } from "./cloudflare";
import { digitalOceanEsitle } from "./digitalocean";
import { domainNameApiEsitle } from "./domainnameapi";
import { openRouterEsitle } from "./openrouter";
import { whmEsitle } from "./whm";

type Esitleyici = (hesapId: string, anahtar: string) => Promise<string>;

// API ile eşitlenebilen sağlayıcılar. Diğerleri (Natro vb.) elle girişle çalışır.
const ESITLEYICILER: Partial<Record<ProviderKind, Esitleyici>> = {
  DIGITALOCEAN: digitalOceanEsitle,
  OPENROUTER: openRouterEsitle,
  CLOUDFLARE: cloudflareEsitle,
  DOMAINNAMEAPI: domainNameApiEsitle,
  OTHER: whmEsitle, // Şimdilik yalnızca cPanel/WHM (OWeb reseller) 'OTHER' türünde eşitlenir
};

export function esitlenebilirMi(kind: ProviderKind): boolean {
  return kind in ESITLEYICILER;
}

// Hesabı eşitler, sonucu hesaba yazar. Dönüş: { basarili, mesaj }
export async function hesabiEsitle(hesapId: string): Promise<{ basarili: boolean; mesaj: string }> {
  const hesap = await prisma.providerAccount.findUnique({ where: { id: hesapId } });
  if (!hesap) return { basarili: false, mesaj: "Hesap bulunamadı." };

  const esitleyici = ESITLEYICILER[hesap.kind];
  if (!esitleyici) return { basarili: false, mesaj: "Bu sağlayıcı için otomatik eşitleme yok." };
  if (!hesap.credentials) return { basarili: false, mesaj: "Hesap için anahtar tanımlı değil." };

  let basarili = true;
  let mesaj: string;
  try {
    mesaj = await esitleyici(hesap.id, decryptSecret(hesap.credentials));
  } catch (hata) {
    basarili = false;
    mesaj = hata instanceof Error ? hata.message : "Bilinmeyen hata.";
  }

  await prisma.providerAccount.update({
    where: { id: hesap.id },
    data: { lastSyncAt: new Date(), lastSyncStatus: `${basarili ? "Başarılı" : "Hata"}: ${mesaj}` },
  });
  return { basarili, mesaj };
}
