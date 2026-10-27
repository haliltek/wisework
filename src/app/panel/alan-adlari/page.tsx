import type { Metadata } from "next";
import { ModulYakinda } from "@/components/modul-yakinda";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Alan Adları & Hosting" };

export default async function AlanAdlariSayfasi() {
  await requirePermission("domains:view");
  return (
    <ModulYakinda
      baslik="Alan Adları & Hosting"
      aciklama="Tüm alan adı, DNS, SSL ve hosting kayıtlarının tek ekranda izlenmesi."
      adim={4}
      ozellikler={[
        "Alan adı listesi: kayıt firması, bitiş tarihi, otomatik yenileme, yenileme maliyeti, bağlı proje",
        "Cloudflare: DNS kayıtları ve SSL durumu (API ile okuma)",
        "DomainNameAPI: alan adı bilgilerinin API ile eşitlenmesi (resmi dokümana göre doğrulanacak)",
        "Natro hosting ve alan adları: elle giriş ve bitiş tarihi hatırlatması (herkese açık API dokümanı bulunamadı)",
        "Bitişe 60, 30, 14 ve 7 gün kala uyarı; süresi dolanlar kırmızı rozetle işaretlenir",
      ]}
    />
  );
}
