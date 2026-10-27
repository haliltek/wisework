# Wise Software: Tümleşik Yazılım Yönetim Platformu (v2)

Bir yazılım şirketinin tüm projelerini, sunucularını (VPS), alan adı ve hosting işlerini, kod depolarını, lisanslarını, bayilerini ve ticari süreçlerini tek çatıda toplayan kurumsal yönetim paneli.

## Dil ve arayüz kuralı (%100 Türkçe)
- Tüm arayüz metni (menü, buton, tablo başlığı, form etiketi, rozet, hata/başarı mesajı, bildirim) Türkçe.
- Kod içi yorumlar Türkçe; değişken, fonksiyon ve tablo adları İngilizce (`camelCase` / `PascalCase`).
- Denetim kaydı `action` anahtarları İngilizce nokta biçiminde (`deploy.start`), `summary` metni Türkçe.

## Kurumsal görünüm ilkeleri
- Ürün adı **Wise Software** (`src/lib/brand.ts`). Logo yazı tabanlıdır.
- **Açık renkli tek tema** (karanlık mod yok). **Hiçbir ikon kullanılmaz** (menü, buton, kart, rozet, uyarı dahil); yalnızca metin. İkon kütüphanesi eklenmez.
- Gradyan, parlama, emoji ve süs yok. Tek vurgu rengi, nötr yüzeyler.
- Yoğun, filtrelenebilir tablolar; sabit başlıklar; ekmek kırıntısı (breadcrumb); boş, yükleniyor ve hata durumları her ekranda.
- Tutarlı Türkçe terimler: Sunucu, Alan Adı, Bitiş Tarihi, Dağıtım, Ortam, Sağlayıcı.
- Marka (logo, renk) geldiğinde yalnızca `globals.css` içindeki değişkenler güncellenir.

## Teknoloji yığını
Next.js 15 (App Router, Server Actions, Route Handlers) · TypeScript · PostgreSQL + Prisma 6 · Auth.js v5 (JWT) · Tailwind CSS 4 + Shadcn tarzı bileşenler (`src/components/ui`) · Recharts · `dockerode` + `systeminformation` (ADIM 3) · `octokit` (ADIM 5).

## Roller ve izinler
Roller: `SUPER_ADMIN` (Yönetici), `DEVELOPER` (Geliştirici), `ACCOUNTING` (Muhasebe), `SUPPORT` (Destek), `PARTNER` (Ara Bayi).
Tek kaynak: `src/lib/rbac.ts` (izin matrisi + yol-izin eşlemesi). Üç katmanlı koruma:
1. `src/middleware.ts` + `src/auth.config.ts` (`canAccessPath`)
2. Sayfa başında `requirePermission(...)` (`src/lib/session.ts`)
3. API ve Server Action içinde izin kontrolü + veri sorgusunda kapsam (bayi yalnızca kendi kayıtları)

Yeni bir modül eklerken: izin tanımla (`PERMISSIONS`), yol eşle (`YOL_IZINLERI`), menüye ekle (`nav.ts`), Türkçe etiket ekle (`permission-labels.ts`), sayfada `requirePermission` çağır.
Bayi (`PARTNER`) sunucu, alan adı, sağlayıcı, kod kasası, kullanıcı ve denetim modüllerini ne arayüzden ne API'den görebilir.

## Modüller (menü bölümleri)
**Genel:** Genel Bakış (`/panel`): rol bazlı üç görünüm (finans, bayi, personel).
**Altyapı:** Projeler (`/panel/projeler`) · Sunucular (`/panel/sunucular`) · Alan Adları & Hosting (`/panel/alan-adlari`) · Sağlayıcı Hesapları (`/panel/saglayicilar`)
**Ticari:** Ürün & Demo Vitrini (`/panel/vitrin`, Müşteri Sunum Modu dahil) · SaaS & Mobil (`/panel/saas-mobil`) · Lisans & Kilitleme (`/panel/lisanslar`, Kill-Switch) · ERP: Bayi, Satış & Destek (`/panel/erp`)
**Yönetim:** Kod & Veritabanı Kasası (`/panel/kod-kasasi`) · Kullanıcılar & Yetkiler (`/panel/kullanicilar`) · Denetim Kayıtları (`/panel/denetim`)

## Sağlayıcı entegrasyonları
| Sağlayıcı | Amaç | Durum |
| --- | --- | --- |
| DigitalOcean | Droplet envanteri, kaynak ve maliyet | API ile otomatik (ADIM 3) |
| Cloudflare | DNS kayıtları, SSL durumu | API ile otomatik (ADIM 4) |
| DomainNameAPI | Alan adı bilgisi, bitiş tarihi | API var gibi görünüyor; resmi dokümandan doğrulanacak (ADIM 4) |
| Natro | Hosting ve alan adları | Herkese açık API dokümanı bulunamadı: elle giriş + bitiş hatırlatması. Doküman gelirse otomatikleştirilir |
| OpenRouter | Yapay zekâ kredi bakiyesi | `GET /api/v1/credits`; yönetim (management) anahtarı gerekir (ADIM 4) |
| GitHub | Depo, commit, sürüm, Actions, Dağıt | Octokit, ince yetkili token (ADIM 5) |

Her sağlayıcı bir bağdaştırıcı (adapter) arayüzü uygular: `sync()` ve `test()`; API'si olmayanlar `MANUAL` modda çalışır.

## Dağıt butonu: güvenli mekanizma
Panel sunucuya doğrudan SSH ile root bağlanmaz. Akış:
1. Kullanıcı Proje > Ortam ekranında **Dağıt**'a basar (`deploy:run` izni gerekir).
2. Panel, GitHub API ile projenin deposunda `workflow_dispatch` tetikler (`ProjectEnvironment.workflowFile`, `branch`).
3. İş akışı imajı derler, GHCR'ye gönderir, sunucuya **yetkisi kısıtlı `deploy` kullanıcısı** ile bağlanıp `docker compose pull && docker compose up -d` çalıştırır. SSH anahtarı GitHub secrets içinde durur, panelde değil.
4. Panel durumu Actions API'den okur (`Deployment` kaydı: kuyrukta, çalışıyor, başarılı, başarısız) ve `deploy.start` / `deploy.finish` denetim kaydı yazar.
Gerekçe: sunucu belleği kısıtlı olduğu için derleme sunucuda yapılmaz.

## Güvenlik kuralları
- Sağlayıcı anahtarı, SSH anahtarı ve 2FA sırrı yalnızca `src/lib/crypto.ts` (AES-256-GCM, `APP_ENCRYPTION_KEY`) ile şifreli saklanır; arayüzde sadece maskeli ipucu gösterilir; loglara ve denetim kaydına yazılmaz.
- Hassas işlemler (dağıtım, rol değişikliği, anahtar değişikliği, lisans kilitleme) `writeAudit` ile kaydedilir; kayıt yazılamazsa işlem iptal edilir.
- Yönetici hesabı için 2FA (TOTP) zorunlu hale getirilecek (ADIM 2).
- Gizli değerler sohbete ve depoya yazılmaz; `.env` git'e girmez.

## Hedef sunucu kuralları (DigitalOcean, 142.93.104.78)
- Sunucuda başka sistemler çalışıyor; bunlara dokunulmaz. Yalnızca `/opt/software-factory` altında, kendi Docker ağı ve kendi PostgreSQL konteyneriyle çalışılır. Mevcut `devcore-postgres` kullanılmaz.
- Bellek yaklaşık 3,8 GB (yaklaşık 1,9 GB kullanılabilir). Derleme sunucuda yapılmaz; konteynerlere bellek sınırı konur.
- Kullanılan portlar: 3090, 3096, 5000 (yerel), 5003, 8087 (yerel), 8088, 8089, 8090, 8091, 8092, 8095, 8096 (eSchool; kaldırılması planlandı). 80/443'ü dinleyen vekil henüz doğrulanmadı: `ss -tln` çıktısı alınmadan port seçilmez.
- `sigorta_php:8.2` ve `mariadb:10.11` imajları birden çok konteyner tarafından paylaşılıyor; imaj silinmez, `docker system prune` kullanılmaz.
- Sunucu işlemlerinden önce salt-okunur keşif yapılır; silme ve durdurma işlemlerini kullanıcı kendisi çalıştırır.

## Adımlar
- **ADIM 1 (tamam):** İskelet, giriş, rol bazlı menü, Genel Bakış, Türkçe örnek veri.
- **ADIM 2:** Şema v2 uygulama ve göç (migration) · kullanıcı ekleme/rol değiştirme · izin matrisi düzenleme · sağlayıcı hesabı ekleme (şifreli anahtar) · 2FA · denetim kaydı bağlama.
- **ADIM 3:** Sunucular: DigitalOcean eşitleme, Docker konteyner listesi ve işlemleri (başlat/durdur/log), Natro ve diğerleri için elle sunucu kaydı.
- **ADIM 4:** Alan Adları & Hosting: Cloudflare, DomainNameAPI, Natro (elle), bitiş uyarıları · OpenRouter kredi izleme.
- **ADIM 5:** Projeler + GitHub (Octokit) + Ortamlar + Dağıt butonu + dağıtım geçmişi + sağlık izleme.
- **ADIM 6:** Vitrin + Müşteri Sunum Modu + Canlı Demo Stüdyosu (Sablier ile uyuyan demolar).
- **ADIM 7:** Lisans & Kill-Switch (`/api/v1/license/verify`).
- **ADIM 8:** ERP: bayi, müşteri, satış, komisyon, destek talepleri.
- **ADIM 9:** SaaS & Mobil yönetimi + Kod & Veritabanı Kasası.
- **ADIM 10:** Docker Compose ile sunucuya izole dağıtım, yedekleme, izleme.

## Çalışma kuralları
- Bir adımı "bitti" demeden önce `npm run typecheck` ve `npm run build` çalıştırılır; çalıştırılamadıysa bu açıkça belirtilir.
- Şema değişiklikleri `prisma migrate` ile yapılır; üretimde `db push` kullanılmaz.
- Varsayımlar README'ye ve ilgili ekrandaki açıklamaya yazılır.
