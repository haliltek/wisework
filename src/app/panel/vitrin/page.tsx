import type { Metadata } from "next";
import { ModulYakinda } from "@/components/modul-yakinda";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Ürün & Demo Vitrini" };

export default async function VitrinSayfasi() {
  await requirePermission("showcase:view");
  return (
    <ModulYakinda
      baslik="Ürün & Demo Vitrini"
      aciklama="Bayilerin müşterilerine ürün sunduğu vitrin."
      adim={6}
      ozellikler={[
        "Sektörel filtreleme (E-Ticaret, ERP & Ön Muhasebe, Sağlık & Klinik, Restoran/POS, Lojistik, Mobil Uygulamalar)",
        "Müşteri Sunum Modu: alış fiyatı, komisyon ve ana şirket markası gizlenir, yalnızca bayi firma adı görünür",
        "Proje detay kartı: açıklama, teknolojiler, ekran görüntüleri, tanıtım videosu",
        "Canlı Demo Stüdyosu: cihaz görünümü seçici, kopyalanabilir demo giriş bilgisi, demo veritabanını sıfırlama",
      ]}
    />
  );
}
