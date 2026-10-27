// Rol ve izin matrisi. Bu dosya Edge (middleware) içinde de çalışır,
// bu yüzden Node'a özgü hiçbir paket içe aktarılmamalıdır.

export type AppRole = "SUPER_ADMIN" | "PARTNER" | "DEVELOPER" | "ACCOUNTING" | "SUPPORT";

export const PERMISSIONS = [
  "dashboard:view",
  "showcase:view",
  "projects:view",
  "projects:manage",
  "deploy:run",
  "servers:view",
  "servers:manage",
  "domains:view",
  "domains:manage",
  "providers:manage",
  "licenses:view",
  "licenses:manage",
  "saas:view",
  "saas:manage",
  "erp:view",
  "erp:manage",
  "partners:manage",
  "finance:view",
  "tickets:view",
  "tickets:manage",
  "code:view",
  "users:manage",
  "audit:view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// Varsayılan izin matrisi. Bayinin (PARTNER) "erp", "tickets" izinleri yalnızca
// KENDİ kayıtları için geçerlidir; bu sınır veri sorgularında ayrıca uygulanır.
const ROL_IZINLERI: Record<AppRole, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  PARTNER: ["dashboard:view", "showcase:view", "erp:view", "tickets:view", "tickets:manage"],
  DEVELOPER: [
    "dashboard:view",
    "showcase:view",
    "projects:view",
    "projects:manage",
    "deploy:run",
    "servers:view",
    "domains:view",
    "licenses:view",
    "code:view",
    "tickets:view",
  ],
  ACCOUNTING: [
    "dashboard:view",
    "finance:view",
    "erp:view",
    "servers:view",
    "domains:view",
    "licenses:view",
  ],
  SUPPORT: [
    "dashboard:view",
    "showcase:view",
    "erp:view",
    "tickets:view",
    "tickets:manage",
    "licenses:view",
    "saas:view",
  ],
};

export function hasPermission(rol: string | null | undefined, izin: Permission): boolean {
  if (!rol || !(rol in ROL_IZINLERI)) return false;
  return ROL_IZINLERI[rol as AppRole].includes(izin);
}

export function permissionsOf(rol: AppRole): readonly Permission[] {
  return ROL_IZINLERI[rol];
}

// Yol -> gerekli izin. En uzun eşleşen önek kazanır. Listede olmayan yollar
// (örn. /panel) yalnızca oturum gerektirir.
const YOL_IZINLERI: readonly (readonly [string, Permission])[] = [
  ["/panel/kullanicilar", "users:manage"],
  ["/panel/denetim", "audit:view"],
  ["/panel/saglayicilar", "providers:manage"],
  ["/panel/sunucular", "servers:view"],
  ["/panel/alan-adlari", "domains:view"],
  ["/panel/projeler", "projects:view"],
  ["/panel/lisanslar", "licenses:view"],
  ["/panel/saas-mobil", "saas:view"],
  ["/panel/kod-kasasi", "code:view"],
  ["/panel/vitrin", "showcase:view"],
  ["/panel/erp/bayiler", "partners:manage"],
  ["/panel/erp", "erp:view"],
  ["/api/admin", "users:manage"],
];

export function requiredPermissionFor(yol: string): Permission | undefined {
  let secilen: readonly [string, Permission] | undefined;
  for (const kayit of YOL_IZINLERI) {
    const [onek] = kayit;
    const eslesir = yol === onek || yol.startsWith(onek + "/");
    if (eslesir && (!secilen || onek.length > secilen[0].length)) secilen = kayit;
  }
  return secilen?.[1];
}

export function canAccessPath(rol: string | null | undefined, yol: string): boolean {
  const gerekli = requiredPermissionFor(yol);
  if (!gerekli) return !!rol;
  return hasPermission(rol, gerekli);
}

export function isAdmin(rol?: string | null): boolean {
  return rol === "SUPER_ADMIN";
}
