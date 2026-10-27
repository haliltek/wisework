import type { Metadata } from "next";
import { ModulYakinda } from "@/components/modul-yakinda";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "ERP" };

export default async function ErpSayfasi() {
  const kullanici = await requirePermission("erp:view");
  const yonetici = kullanici.role === "SUPER_ADMIN";

  return (
    <ModulYakinda
      baslik={yonetici ? "ERP: Bayiler, Müşteriler, Satış & Destek" : "Müşteriler, Satışlar & Destek"}
      aciklama={
        yonetici
          ? "Bayi, müşteri, satış ve destek yönetimi."
          : "Kendi müşterileriniz, satışlarınız, hakedişiniz ve destek talepleriniz."
      }
      adim={8}
      ozellikler={[
        ...(yonetici
          ? ["Bayi yönetimi: bayi ekleme, bayiye özel komisyon oranı (%), cari / hakediş takibi"]
          : []),
        "Müşteriler ve satışlar: komisyon ve şirkete kalan net gelir otomatik hesaplanır",
        "Satış Tamamlandı olduğunda lisans anahtarı otomatik üretilir",
        "Destek talepleri (ticket): kurulum ve hata talepleri, yönetici ile yazışma",
      ]}
    />
  );
}
