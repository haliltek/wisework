// Wise Software yerel kurulum yardımcısı.
// Kullanım (proje klasöründe): npm run kurulum
//
// Yaptıkları:
//  1. .env içindeki DATABASE_URL'den kullanıcı ve veritabanı bilgisini okur
//  2. (İsteğe bağlı) psql ile PostgreSQL'de kullanıcıyı ve veritabanını oluşturur
//  3. Tabloları oluşturur (prisma db push)
//  4. (İsteğe bağlı) Türkçe örnek veriyi yükler (db:seed)

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const ENV_YOLU = ".env";
const rl = createInterface({ input: stdin, output: stdout });

function bitir(kod, mesaj) {
  if (mesaj) console.log(mesaj);
  rl.close();
  process.exit(kod);
}

async function evetMi(soru, varsayilan = true) {
  const cevap = (await rl.question(`${soru} ${varsayilan ? "(E/h)" : "(e/H)"} `)).trim().toLowerCase();
  if (!cevap) return varsayilan;
  return cevap === "e" || cevap === "evet";
}

// npm/npx Windows'ta .cmd olduğu için shell gerekir; psql gerçek bir .exe'dir
function calistir(komut, args, { shell = false } = {}) {
  return spawnSync(komut, args, { stdio: "inherit", shell });
}

if (!existsSync(ENV_YOLU)) {
  bitir(1, "HATA: .env bulunamadı. .env.example dosyasını .env olarak kopyalayıp doldurun.");
}

let envMetni = readFileSync(ENV_YOLU, "utf8");
const eslesme = envMetni.match(/^DATABASE_URL="?([^"\r\n]+)"?/m);
if (!eslesme) bitir(1, "HATA: .env içinde DATABASE_URL bulunamadı.");

let adres;
try {
  adres = new URL(eslesme[1]);
} catch {
  bitir(1, "HATA: DATABASE_URL okunamadı. Biçim: postgresql://kullanici:sifre@localhost:5432/veritabani");
}

const kullanici = decodeURIComponent(adres.username);
const veritabani = decodeURIComponent(adres.pathname.replace(/^\//, ""));
const sunucu = adres.hostname || "localhost";
const port = adres.port || "5432";

console.log(`\nHedef veritabanı: ${veritabani} (kullanıcı: ${kullanici}, sunucu: ${sunucu}:${port})\n`);

// ---------- 1) PostgreSQL kullanıcısı ve veritabanı ----------
const psqlVarMi = spawnSync("psql", ["--version"], { stdio: "ignore" }).status === 0;

if (!psqlVarMi) {
  console.log("Bilgi: 'psql' komutu bulunamadı; kullanıcı ve veritabanı otomatik oluşturulamayacak.");
  console.log("PostgreSQL'i kurduysanız psql'in bulunduğu klasörü (örn. C:\\Program Files\\PostgreSQL\\16\\bin) PATH'e ekleyin.");
  console.log("Kullanıcı ve veritabanı zaten varsa bu adım atlanır.\n");
} else if (await evetMi("PostgreSQL'de kullanıcı ve veritabanı otomatik oluşturulsun mu?")) {
  if (!/^[A-Za-z0-9_]+$/.test(kullanici) || !/^[A-Za-z0-9_]+$/.test(veritabani)) {
    bitir(1, "HATA: Kullanıcı ve veritabanı adı yalnızca harf, rakam ve alt çizgi içerebilir.");
  }

  let sifre = decodeURIComponent(adres.password);
  if (!sifre || sifre === "DEGISTIRIN") {
    sifre = randomBytes(18).toString("base64url").replace(/[^A-Za-z0-9]/g, "A");
    adres.password = sifre;
    envMetni = envMetni.replace(eslesme[1], adres.toString());
    writeFileSync(ENV_YOLU, envMetni, "utf8");
    console.log("DATABASE_URL içindeki örnek şifre, rastgele güçlü bir şifreyle değiştirildi (.env güncellendi).");
  }
  if (sifre.includes("'")) bitir(1, "HATA: Şifre tek tırnak içeremez.");

  const sqlYolu = join(tmpdir(), `wise-kurulum-${Date.now()}.sql`);
  writeFileSync(
    sqlYolu,
    [
      "DO $do$ BEGIN",
      `  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${kullanici}') THEN`,
      `    CREATE ROLE "${kullanici}" LOGIN PASSWORD '${sifre}';`,
      "  ELSE",
      `    ALTER ROLE "${kullanici}" WITH LOGIN PASSWORD '${sifre}';`,
      "  END IF;",
      "END $do$;",
      `SELECT 'CREATE DATABASE "${veritabani}" OWNER "${kullanici}"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${veritabani}') \\gexec`,
      "",
    ].join("\n"),
    "utf8",
  );

  console.log("\nPostgreSQL yönetici ('postgres') şifresi sorulacak (yazarken görünmez):\n");
  const sonuc = calistir("psql", ["-U", "postgres", "-h", sunucu, "-p", port, "-d", "postgres", "-W", "-v", "ON_ERROR_STOP=1", "-f", sqlYolu]);
  rmSync(sqlYolu, { force: true }); // içinde şifre var; hemen silinir

  if (sonuc.status !== 0) {
    bitir(1, "\nHATA: Kullanıcı/veritabanı oluşturulamadı. Yönetici şifresini ve PostgreSQL'in çalıştığını kontrol edin.");
  }
  console.log("\nKullanıcı ve veritabanı hazır.\n");
}

// ---------- 2) Tabloları oluştur ----------
console.log("Tablolar oluşturuluyor (prisma db push)...\n");
const push = calistir("npx", ["prisma", "db", "push"], { shell: process.platform === "win32" });
if (push.status !== 0) {
  bitir(
    1,
    "\nHATA: Tablolar oluşturulamadı. Sık nedenler:\n" +
      "  P1000: kullanıcı adı/şifre yanlış (.env içindeki DATABASE_URL)\n" +
      "  P1001: PostgreSQL çalışmıyor veya adres/port yanlış\n" +
      "  P1003: veritabanı yok (bu betiği tekrar çalıştırıp oluşturmayı seçin)",
  );
}

// ---------- 3) Örnek veri ----------
if (await evetMi("\nTürkçe örnek veri yüklensin mi? (giriş hesaplarını ve şifreleri sonunda gösterir)")) {
  const tohum = calistir("npm", ["run", "db:seed"], { shell: process.platform === "win32" });
  if (tohum.status !== 0) bitir(1, "\nHATA: Örnek veri yüklenemedi. Yukarıdaki hata satırını inceleyin.");
}

bitir(0, "\nKurulum tamamlandı. Başlatmak için: npm run dev\n");
