# Wise Software: Yönetim Platformu

Next.js 15 + TypeScript + Prisma (PostgreSQL) + Auth.js v5 + Tailwind CSS 4.
Arayüzün tamamı Türkçedir; kod içi yorumlar Türkçe, tanımlayıcılar İngilizcedir.

## ADIM 1'de neler var?

- Proje iskeleti, Prisma şeması (`prisma/schema.prisma`) ve Türkçe örnek veri (`prisma/seed.ts`)
- Giriş ekranı (`/giris`), Auth.js (e-posta + şifre, JWT oturum, 12 saat), hatalı deneme sınırı
- Rol bazlı sol menü (7 modül), karanlık/aydınlık mod, mobil uyumlu kabuk
- `/panel` Genel Bakış: yönetici görünümü (MRR, ciro, SaaS, lisans, sunucu çubukları, grafik, son satışlar) ve bayi görünümü (satış, hakediş, bekleyen ödeme, hızlı arama)
- Rol koruması üç katmanda: middleware, sayfa (`requireAdmin`) ve API (`/api/admin/*`)
- Diğer modüller için "yakında" sayfaları (ADIM 2 ile 6)
- `GET /api/saglik`: izleme / Docker healthcheck ucu

## Kurulum (kendi bilgisayarınızda)

Gereksinimler: Node.js 20+ ve bir PostgreSQL veritabanı.

```bash
npm install
cp .env.example .env        # DATABASE_URL ve AUTH_SECRET değerlerini doldurun
npx prisma db push          # tabloları oluşturur (veya: npm run db:migrate)
npm run db:seed             # Türkçe örnek veri; şifreler terminale bir kez yazdırılır
npm run dev                 # http://localhost:3000
```

Kontrol: `npm run typecheck` ve `npm run build`.

## Roller

| Rol | Erişim (varsayılan) |
| --- | --- |
| Yönetici (`SUPER_ADMIN`) | Tüm modüller |
| Geliştirici (`DEVELOPER`) | Projeler, dağıtım, sunucu/alan adı/lisans görüntüleme, kod kasası |
| Muhasebe (`ACCOUNTING`) | Finans özeti, ERP, sunucu/alan adı/lisans görüntüleme (maliyet takibi) |
| Destek (`SUPPORT`) | Destek talepleri, ERP, lisans ve SaaS görüntüleme, vitrin |
| Ara Bayi (`PARTNER`) | Genel Bakış, Vitrin, yalnızca kendi müşteri/satış/destek kayıtları |

İzin matrisi `src/lib/rbac.ts` içinde tanımlıdır ve `/panel/kullanicilar` ekranında salt okunur gösterilir.
Bu matris varsayılandır; muhasebe ve destek rollerinin yetkilerini gözden geçirin.
Bayi; sunucu, alan adı, sağlayıcı, kod kasası, kullanıcı ve denetim modüllerine ne arayüzden ne de API'den erişebilir.

## Sağlayıcı anahtarlarının şifrelenmesi

`.env` içindeki `APP_ENCRYPTION_KEY` (`openssl rand -base64 32`) ile sağlayıcı anahtarları AES-256-GCM ile şifrelenir (`src/lib/crypto.ts`).
Bu anahtarı kaybederseniz şifreli veriler geri alınamaz; yedeğini güvenli bir yerde tutun.

## Tasarım kararları ve varsayımlar

- Base UI: Şablonlar (shadcn-admin, next-shadcn-dashboard-starter) Vite veya Clerk tabanlı olduğundan doğrudan kopyalanmadı; aynı görünüm Shadcn tarzı bileşenlerle `src/components/ui` altında yazıldı.
- Para birimi TL olarak biçimlendirilir (`src/lib/format.ts`). Şemadaki `Float` alanlar için tutarlar kuruşa yuvarlanır.
- MRR ve "Aktif SaaS": yalnızca `RUNNING` kiracılar. "Toplam ciro": yalnızca `TAMAMLANDI` satışlar.
- Bayi "Bekleyen Ödeme": `KURULUM_BEKLIYOR` durumundaki satışların hakedişi (şemada ödeme/mahsup tablosu yok; ADIM 5'te netleştirilecek).
- Sunucu çubukları şimdilik uygulamanın çalıştığı makinenin `os` bilgisinden okunur; ADIM 3'te `systeminformation` + `dockerode` ile ayrıntılanacak.
- Seed'deki alan adları ve GitHub bağlantıları (`example.com`, `ornek-sirket`) örnektir.

## Sunucuya kurulum notları (ADIM 7'de otomatikleştirilecek)

- Hedef sunucuda çalışan diğer sistemlere dokunulmaz; bu uygulama kendi klasöründe (`/opt/software-factory`), kendi Docker ağında ve kendi PostgreSQL konteynerinde çalışır. Mevcut `devcore-postgres` veya başka veritabanları kullanılmaz.
- Sunucu belleği kısıtlıdır (yaklaşık 3,8 GB). Next.js derlemesini sunucuda değil, kendi bilgisayarınızda ya da CI'da yapıp hazır imajı sunucuya gönderin.
- Ters vekil (nginx/caddy) şu başlıkları iletmelidir: `Host`, `X-Forwarded-Proto`, `X-Forwarded-For`. `AUTH_TRUST_HOST=true` ve `AUTH_URL` ayarlanmalıdır.
- Kullanılmayan bir port seçilmeden önce sunucuda `ss -tln` ile dinleyen tüm portlar kontrol edilmelidir.

## Sonraki adımlar

Ayrıntılı plan `CLAUDE.md` içindedir: ADIM 2 kullanıcı, izin ve sağlayıcı yönetimi · ADIM 3 sunucular · ADIM 4 alan adları ve OpenRouter · ADIM 5 projeler, GitHub ve Dağıt butonu · ADIM 6 vitrin ve demo · ADIM 7 lisans · ADIM 8 ERP · ADIM 9 SaaS/mobil ve kod kasası · ADIM 10 dağıtım.

Şema v2 eklendi (sağlayıcı hesapları, alan adları, ortamlar, dağıtımlar, denetim). Mevcut bir veritabanınız varsa `npx prisma db push` yeni tabloları ekler.
