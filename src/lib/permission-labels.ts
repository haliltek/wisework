import type { Permission } from "./rbac";

// İzin matrisi ekranında gösterilen Türkçe karşılıklar (bölüm, açıklama)
export const IZIN_ETIKETLERI: Record<Permission, { bolum: string; etiket: string }> = {
  "dashboard:view": { bolum: "Genel", etiket: "Genel Bakışı görüntüle" },
  "projects:view": { bolum: "Projeler", etiket: "Projeleri görüntüle" },
  "projects:manage": { bolum: "Projeler", etiket: "Proje ve ortam ekle / düzenle" },
  "deploy:run": { bolum: "Projeler", etiket: "Dağıt butonunu kullan" },
  "servers:view": { bolum: "Sunucular", etiket: "Sunucuları ve konteynerleri görüntüle" },
  "servers:manage": { bolum: "Sunucular", etiket: "Konteyner başlat / durdur, sunucu düzenle" },
  "domains:view": { bolum: "Alan Adları", etiket: "Alan adı ve hosting kayıtlarını görüntüle" },
  "domains:manage": { bolum: "Alan Adları", etiket: "Alan adı ve DNS düzenle" },
  "providers:manage": { bolum: "Sağlayıcılar", etiket: "Sağlayıcı hesaplarını ve anahtarlarını yönet" },
  "showcase:view": { bolum: "Ticari", etiket: "Ürün ve demo vitrinini görüntüle" },
  "saas:view": { bolum: "Ticari", etiket: "SaaS ve mobil uygulamaları görüntüle" },
  "saas:manage": { bolum: "Ticari", etiket: "Kiracı konteynerlerini yönet" },
  "licenses:view": { bolum: "Ticari", etiket: "Lisansları görüntüle" },
  "licenses:manage": { bolum: "Ticari", etiket: "Lisans durumunu değiştir (kilitleme)" },
  "erp:view": { bolum: "Ticari", etiket: "Müşteri ve satışları görüntüle" },
  "erp:manage": { bolum: "Ticari", etiket: "Müşteri ve satış kaydı yönet" },
  "partners:manage": { bolum: "Ticari", etiket: "Bayileri ve komisyon oranlarını yönet" },
  "finance:view": { bolum: "Ticari", etiket: "Ciro ve finans özetini görüntüle" },
  "tickets:view": { bolum: "Destek", etiket: "Destek taleplerini görüntüle" },
  "tickets:manage": { bolum: "Destek", etiket: "Destek taleplerini yanıtla ve yönet" },
  "code:view": { bolum: "Yönetim", etiket: "Kod ve veritabanı kasasını görüntüle" },
  "users:manage": { bolum: "Yönetim", etiket: "Kullanıcıları ve rolleri yönet" },
  "audit:view": { bolum: "Yönetim", etiket: "Denetim kayıtlarını görüntüle" },
};
