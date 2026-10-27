import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission, type Permission } from "@/lib/rbac";

// Sunucu tarafı ikinci savunma hattı: middleware atlansa bile sayfa verisi korunur

export async function requireUser() {
  const oturum = await auth();
  if (!oturum?.user?.id) redirect("/giris");
  return oturum.user;
}

export async function requirePermission(izin: Permission) {
  const kullanici = await requireUser();
  if (!hasPermission(kullanici.role, izin)) redirect("/panel?yetkisiz=1");
  return kullanici;
}

export async function requireAdmin() {
  const kullanici = await requireUser();
  if (kullanici.role !== "SUPER_ADMIN") redirect("/panel?yetkisiz=1");
  return kullanici;
}
