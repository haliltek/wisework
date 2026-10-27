import os from "node:os";
import { statfs } from "node:fs/promises";

const GB = 1024 ** 3;

// Uygulamanın çalıştığı sunucunun anlık durumu (ek paket gerektirmez).
// ADIM 3'te systeminformation + dockerode ile ayrıntılı hale getirilecek.
export async function getSistemDurumu() {
  const cekirdek = os.cpus().length || 1;
  // Son 1 dakikalık yük ortalaması / çekirdek sayısı (Windows'ta 0 döner)
  const cpuYuzde = Math.min(100, (os.loadavg()[0] / cekirdek) * 100);

  const ramToplam = os.totalmem();
  const ramKullanilan = ramToplam - os.freemem();

  let diskToplam = 0;
  let diskKullanilan = 0;
  try {
    const durum = await statfs("/");
    diskToplam = durum.blocks * durum.bsize;
    diskKullanilan = (durum.blocks - durum.bavail) * durum.bsize;
  } catch {
    // Disk bilgisi okunamazsa 0 olarak bırakılır
  }

  return {
    cekirdek,
    cpuYuzde,
    ramToplamGb: ramToplam / GB,
    ramKullanilanGb: ramKullanilan / GB,
    ramYuzde: ramToplam > 0 ? (ramKullanilan / ramToplam) * 100 : 0,
    diskToplamGb: diskToplam / GB,
    diskKullanilanGb: diskKullanilan / GB,
    diskYuzde: diskToplam > 0 ? (diskKullanilan / diskToplam) * 100 : 0,
    calismaSuresiGun: os.uptime() / 86400,
  };
}
