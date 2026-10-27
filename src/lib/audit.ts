import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DenetimGirdisi = {
  userId?: string | null;
  // Örn: "deploy.start", "user.role_change", "provider.credentials_update"
  action: string;
  entityType: string;
  entityId?: string | null;
  // Türkçe, okunabilir özet. Gizli değerler (anahtar, şifre) ASLA yazılmaz.
  summary: string;
  ip?: string | null;
  meta?: Prisma.InputJsonValue;
};

// Hassas işlemlerde (dağıtım, yetki, kimlik bilgisi değişikliği) çağıran taraf
// denetim kaydı yazılamazsa işlemi iptal etmelidir; bu yüzden hata yutulmaz.
export async function writeAudit(girdi: DenetimGirdisi) {
  return prisma.auditLog.create({
    data: {
      userId: girdi.userId ?? null,
      action: girdi.action,
      entityType: girdi.entityType,
      entityId: girdi.entityId ?? null,
      summary: girdi.summary,
      ip: girdi.ip ?? null,
      meta: girdi.meta,
    },
  });
}
