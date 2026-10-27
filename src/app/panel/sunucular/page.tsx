import type { Metadata } from "next";
import { ModulYakinda } from "@/components/modul-yakinda";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Sunucu & Konteynerler" };

export default async function SunucularSayfasi() {
  await requirePermission("servers:view");
  return (
    <ModulYakinda
      baslik="Sunucu & Konteyner Kontrolü"
      aciklama="Yalnızca yöneticiye açık sunucu yönetimi."
      adim={3}
      ozellikler={[
        "Canlı CPU, RAM, Disk ve çalışma süresi grafikleri",
        "Sunucudaki tüm Docker konteynerlerinin listesi ve durum rozetleri (Çalışıyor, Uyuyor - Sablier, Durduruldu)",
        "Başlat, Durdur, Logları Gör ve Yedek Al işlemleri",
        "Yalnızca bu uygulamaya ait konteynerler üzerinde işlem yapma (sunucudaki diğer sistemler korunur)",
      ]}
    />
  );
}
