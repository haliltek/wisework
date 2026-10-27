import { auth } from "@/auth";
import { hasPermission } from "@/lib/rbac";
import { getSistemDurumu } from "@/lib/system";

export const dynamic = "force-dynamic";

// Canlı grafik için anlık sunucu metrikleri (yalnızca servers:view izni olanlar)
export async function GET() {
  const oturum = await auth();
  if (!oturum?.user) return Response.json({ hata: "Oturum açmanız gerekiyor." }, { status: 401 });
  if (!hasPermission(oturum.user.role, "servers:view")) {
    return Response.json({ hata: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const d = await getSistemDurumu();
  return Response.json({
    zaman: Date.now(),
    cpu: Math.round(d.cpuYuzde * 10) / 10,
    ram: Math.round(d.ramYuzde * 10) / 10,
    disk: Math.round(d.diskYuzde * 10) / 10,
  });
}
