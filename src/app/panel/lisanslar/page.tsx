import type { Metadata } from "next";
import { ModulYakinda } from "@/components/modul-yakinda";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Lisans & Kilitleme" };

export default async function LisanslarSayfasi() {
  await requirePermission("licenses:view");
  return (
    <ModulYakinda
      baslik="Lisans & Uzaktan Kilitleme Merkezi"
      aciklama="Müşterilere satılan yazılımların lisans takibi."
      adim={7}
      ozellikler={[
        "Lisans anahtarı (LIC-XXXX-XXXX-XXXX), domain / IP, bitiş tarihi ve son sinyal zamanı",
        "Kill-Switch: lisansı Aktif, Askıda (Ödeme Bekliyor) veya İptal durumuna çekme",
        "Müşteri yazılımının /api/v1/license/verify ucundan olumsuz yanıt alıp ekranı kilitlemesi",
      ]}
    />
  );
}
