import { hasPermission, type AppRole, type Permission } from "./rbac";

export type NavItem = {
  href: string;
  label: string;
  // Bayi için farklı etiket gerekiyorsa
  partnerLabel?: string;
  section: string;
  permission?: Permission;
};

// Sol menü; bölümlere ayrılmıştır. Yetkisi olmayan öğe menüde görünmez.
export const NAV_ITEMS: NavItem[] = [
  { href: "/panel", label: "Genel Bakış", section: "Genel" },

  { href: "/panel/projeler", label: "Projeler", section: "Altyapı", permission: "projects:view" },
  { href: "/panel/sunucular", label: "Sunucular", section: "Altyapı", permission: "servers:view" },
  { href: "/panel/alan-adlari", label: "Alan Adları & Hosting", section: "Altyapı", permission: "domains:view" },
  { href: "/panel/saglayicilar", label: "Sağlayıcı Hesapları", section: "Altyapı", permission: "providers:manage" },

  { href: "/panel/vitrin", label: "Ürün & Demo Vitrini", section: "Ticari", permission: "showcase:view" },
  { href: "/panel/saas-mobil", label: "SaaS & Mobil", section: "Ticari", permission: "saas:view" },
  { href: "/panel/lisanslar", label: "Lisans & Kilitleme", section: "Ticari", permission: "licenses:view" },
  {
    href: "/panel/erp",
    label: "ERP: Bayi, Satış & Destek",
    partnerLabel: "Müşteriler, Satışlar & Destek",
    section: "Ticari",
    permission: "erp:view",
  },

  { href: "/panel/kod-kasasi", label: "Kod & Veritabanı Kasası", section: "Yönetim", permission: "code:view" },
  { href: "/panel/kullanicilar", label: "Kullanıcılar & Yetkiler", section: "Yönetim", permission: "users:manage" },
  { href: "/panel/denetim", label: "Denetim Kayıtları", section: "Yönetim", permission: "audit:view" },
];

export function navForRole(rol: AppRole) {
  return NAV_ITEMS.filter((oge) => !oge.permission || hasPermission(rol, oge.permission)).map((oge) => ({
    href: oge.href,
    label: rol === "PARTNER" && oge.partnerLabel ? oge.partnerLabel : oge.label,
    section: oge.section,
  }));
}
