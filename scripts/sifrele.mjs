// Standart girdiden okunan gizli değeri, uygulamayla aynı biçimde (AES-256-GCM, v1) şifreler.
// Çıktı tek satırdır: <şifreli paket>|<maskeli ipucu>. Anahtar APP_ENCRYPTION_KEY ortam değişkeninden gelir.
// Düz metin diske yazılmaz ve ekrana basılmaz.
import { createCipheriv, randomBytes } from "node:crypto";

const parcalar = [];
for await (const parca of process.stdin) parcalar.push(parca);
const deger = Buffer.concat(parcalar).toString("utf8").trim();
if (!deger) {
  console.error("HATA: Boş değer girildi.");
  process.exit(1);
}

const anahtar = Buffer.from(process.env.APP_ENCRYPTION_KEY ?? "", "base64");
if (anahtar.length !== 32) {
  console.error("HATA: APP_ENCRYPTION_KEY tanımlı değil veya 32 bayt değil.");
  process.exit(1);
}

const iv = randomBytes(12);
const sifreleyici = createCipheriv("aes-256-gcm", anahtar, iv);
const veri = Buffer.concat([sifreleyici.update(deger, "utf8"), sifreleyici.final()]);
const paket = ["v1", iv.toString("base64"), sifreleyici.getAuthTag().toString("base64"), veri.toString("base64")].join(":");
// "json" argümanıyla çağrılırsa ipucu JSON içindeki apiKey alanından üretilir
let ipucuKaynagi = deger;
if (process.argv[2] === "json") {
  try {
    const j = JSON.parse(deger);
    ipucuKaynagi = String(j.apiKey ?? j.token ?? "");
  } catch {
    console.error("HATA: Değer geçerli bir JSON değil.");
    process.exit(1);
  }
}
const ipucu = ipucuKaynagi.length > 8 ? `••••${ipucuKaynagi.slice(-4)}` : "••••";
process.stdout.write(`${paket}|${ipucu}\n`);
