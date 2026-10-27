import type { Metadata } from "next";
import { ModulYakinda } from "@/components/modul-yakinda";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Kod & Veritabanı Kasası" };

export default async function KodKasasiSayfasi() {
  await requirePermission("code:view");
  return (
    <ModulYakinda
      baslik="Kod & Veritabanı Kasası"
      aciklama="Yalnızca yöneticiye açık gizli kasa."
      adim={9}
      ozellikler={[
        "Projelerin GitHub özel (private) depo bağlantıları, son commit ve sürüm bilgileri (Octokit)",
        ".env şablonu, mimari notlar ve kurulum rehberi",
        "Başlangıç veritabanı yedeği (seed.sql) ve kaynak kod paketi (.zip) indirme",
        "Bayi rolü bu modüle ne arayüzden ne de API'den erişebilir",
      ]}
    />
  );
}
