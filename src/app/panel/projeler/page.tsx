import type { Metadata } from "next";
import { ModulYakinda } from "@/components/modul-yakinda";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Projeler" };

export default async function ProjelerSayfasi() {
  await requirePermission("projects:view");
  return (
    <ModulYakinda
      baslik="Projeler"
      aciklama="Her projenin depo, sunucu, alan adı ve dağıtım bilgilerinin tek kartta toplandığı merkez kayıt."
      adim={5}
      ozellikler={[
        "Proje kartı: GitHub deposu, son commit ve sürüm, ortamlar (Üretim / Hazırlık), bağlı sunucu ve alan adı",
        "Dağıt butonu: GitHub Actions iş akışını tetikler, durumu canlı izler, her dağıtım denetim kaydına yazılır",
        "Dağıtım geçmişi: kim, ne zaman, hangi sürümü, hangi ortama gönderdi; sonuç ve günlük bağlantısı",
        "Sağlık izleme: ortamın sağlık adresine periyodik kontrol, çalışma durumu rozeti",
      ]}
    />
  );
}
