// Veritabanı durum kodlarının Türkçe karşılıkları

export type RozetRengi =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "outline";

export const SATIS_DURUMLARI: Record<string, { etiket: string; renk: RozetRengi }> = {
  DEMO_ASAMASI: { etiket: "Demo Aşamasında", renk: "info" },
  KURULUM_BEKLIYOR: { etiket: "Kurulum Bekliyor", renk: "warning" },
  TAMAMLANDI: { etiket: "Tamamlandı", renk: "success" },
  IPTAL: { etiket: "İptal", renk: "destructive" },
};

export const LISANS_DURUMLARI: Record<string, { etiket: string; renk: RozetRengi }> = {
  ACTIVE: { etiket: "Aktif", renk: "success" },
  SUSPENDED: { etiket: "Askıda (Ödeme Bekliyor)", renk: "warning" },
  EXPIRED: { etiket: "Süresi Doldu", renk: "secondary" },
  REVOKED: { etiket: "İptal Edildi", renk: "destructive" },
};

export const KONTEYNER_DURUMLARI: Record<string, { etiket: string; renk: RozetRengi }> = {
  RUNNING: { etiket: "Çalışıyor", renk: "success" },
  SLEEPING: { etiket: "Uyuyor - Sablier", renk: "info" },
  STOPPED: { etiket: "Durduruldu", renk: "secondary" },
  ERROR: { etiket: "Hata", renk: "destructive" },
};

export const ROL_ETIKETLERI: Record<string, string> = {
  SUPER_ADMIN: "Yönetici",
  PARTNER: "Ara Bayi",
  DEVELOPER: "Geliştirici",
  ACCOUNTING: "Muhasebe",
  SUPPORT: "Destek",
};

export const SAGLAYICI_ETIKETLERI: Record<string, string> = {
  DIGITALOCEAN: "DigitalOcean",
  CLOUDFLARE: "Cloudflare",
  DOMAINNAMEAPI: "DomainNameAPI",
  NATRO: "Natro",
  OPENROUTER: "OpenRouter",
  GITHUB: "GitHub",
  OTHER: "Diğer",
};

export const DAGITIM_DURUMLARI: Record<string, { etiket: string; renk: RozetRengi }> = {
  QUEUED: { etiket: "Kuyrukta", renk: "secondary" },
  RUNNING: { etiket: "Çalışıyor", renk: "info" },
  SUCCESS: { etiket: "Başarılı", renk: "success" },
  FAILED: { etiket: "Başarısız", renk: "destructive" },
  CANCELLED: { etiket: "İptal Edildi", renk: "warning" },
};

export function satisDurumu(kod: string) {
  return SATIS_DURUMLARI[kod] ?? { etiket: kod, renk: "outline" as RozetRengi };
}
