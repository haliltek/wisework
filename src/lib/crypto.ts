import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// API anahtarı, SSH anahtarı ve 2FA sırrı gibi gizli değerlerin veritabanında
// şifreli saklanması için AES-256-GCM. Anahtar ortam değişkeninden gelir:
//   APP_ENCRYPTION_KEY = 32 baytlık anahtarın base64 hali  (openssl rand -base64 32)
// Anahtar kaybolursa şifreli veriler geri alınamaz; yedeğini güvenli yerde tutun.

const ALGORITMA = "aes-256-gcm";
const SURUM = "v1";

function anahtarAl(): Buffer {
  const b64 = process.env.APP_ENCRYPTION_KEY;
  if (!b64) throw new Error("APP_ENCRYPTION_KEY tanımlı değil.");
  const anahtar = Buffer.from(b64, "base64");
  if (anahtar.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY, base64 çözüldüğünde tam 32 bayt olmalıdır.");
  }
  return anahtar;
}

// Çıktı biçimi: v1:<iv>:<etiket>:<veri> (hepsi base64)
export function encryptSecret(duzMetin: string): string {
  const iv = randomBytes(12);
  const sifreleyici = createCipheriv(ALGORITMA, anahtarAl(), iv);
  const veri = Buffer.concat([sifreleyici.update(duzMetin, "utf8"), sifreleyici.final()]);
  const etiket = sifreleyici.getAuthTag();
  return [SURUM, iv.toString("base64"), etiket.toString("base64"), veri.toString("base64")].join(":");
}

export function decryptSecret(paket: string): string {
  const [surum, iv, etiket, veri] = paket.split(":");
  if (surum !== SURUM || !iv || !etiket || !veri) {
    throw new Error("Geçersiz şifreli veri biçimi.");
  }
  const cozucu = createDecipheriv(ALGORITMA, anahtarAl(), Buffer.from(iv, "base64"));
  cozucu.setAuthTag(Buffer.from(etiket, "base64"));
  return Buffer.concat([cozucu.update(Buffer.from(veri, "base64")), cozucu.final()]).toString("utf8");
}

// Arayüzde gösterilecek maskeli ipucu (örn: ••••a1b2). Değerin tamamı asla gösterilmez.
export function secretHint(deger: string): string {
  return deger.length > 8 ? `••••${deger.slice(-4)}` : "••••";
}
