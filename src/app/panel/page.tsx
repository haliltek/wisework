import type { Metadata } from "next";
import { AdminOverview } from "@/components/dashboard/admin-overview";
import { PartnerOverview } from "@/components/dashboard/partner-overview";
import { StaffOverview } from "@/components/dashboard/staff-overview";
import { hasPermission } from "@/lib/rbac";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Genel Bakış" };
export const dynamic = "force-dynamic";

export default async function GenelBakisSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ yetkisiz?: string }>;
}) {
  const kullanici = await requireUser();
  const { yetkisiz } = await searchParams;

  const bayi = kullanici.role === "PARTNER";
  const finansGorunumu = hasPermission(kullanici.role, "finance:view");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Genel Bakış</h1>
        <p className="text-sm text-muted-foreground">
          {bayi
            ? "Satışlarınızın ve hakedişinizin özeti."
            : finansGorunumu
              ? "Şirketin gelir, müşteri, lisans ve sunucu özeti."
              : "Çalışma alanınıza genel bakış."}
        </p>
      </div>

      {yetkisiz && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Bu bölüme erişim yetkiniz bulunmuyor.
        </div>
      )}

      {bayi ? (
        <PartnerOverview partnerId={kullanici.id} />
      ) : finansGorunumu ? (
        <AdminOverview />
      ) : (
        <StaffOverview rol={kullanici.role} />
      )}
    </div>
  );
}
