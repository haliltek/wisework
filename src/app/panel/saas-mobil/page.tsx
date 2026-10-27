import type { Metadata } from "next";
import { ModulYakinda } from "@/components/modul-yakinda";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "SaaS & Mobil Uygulamalar" };

export default async function SaasMobilSayfasi() {
  await requirePermission("saas:view");
  return (
    <ModulYakinda
      baslik="SaaS & Mobil Uygulama Yönetimi"
      aciklama="Kiracı (tenant) ve mobil uygulama takibi."
      adim={9}
      ozellikler={[
        "Hangi müşteride hangi SaaS projesinin kurulu olduğu, alt alan adı, paket, veritabanı boyutu ve konteyner durumu",
        "Tek tıkla konteyneri yeniden başlatma / güncelleme",
        "iOS App Store ve Google Play bağlantıları, aktif sürüm, QR ile test .apk indirme",
        "Zorunlu Güncelleme (Force Update) anahtarı",
      ]}
    />
  );
}
