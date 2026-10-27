import { prisma } from "@/lib/prisma";
import { saglayiciGet } from "./http";

interface Droplet {
  id: number;
  name: string;
  status: string;
  vcpus: number;
  memory: number; // MB
  disk: number; // GB
  region: { slug: string };
  size: { price_monthly: number };
  networks: { v4: { ip_address: string; type: string }[] };
}

// DigitalOcean dropletlerini ServerNode kayıtlarıyla eşitler (yalnızca okuma izni yeterli)
export async function digitalOceanEsitle(hesapId: string, anahtar: string): Promise<string> {
  const veri = await saglayiciGet<{ droplets: Droplet[] }>(
    "https://api.digitalocean.com/v2/droplets?per_page=200",
    anahtar,
  );

  for (const d of veri.droplets) {
    const ip = d.networks.v4.find((a) => a.type === "public")?.ip_address ?? "-";
    const alanlar = {
      name: d.name,
      ipAddress: ip,
      cpuCores: d.vcpus,
      ramTotalGb: d.memory / 1024,
      diskTotalGb: d.disk,
      isOnline: d.status === "active",
      region: d.region.slug,
      monthlyCost: d.size.price_monthly,
    };
    const mevcut = await prisma.serverNode.findFirst({
      where: { providerAccountId: hesapId, externalId: String(d.id) },
      select: { id: true },
    });
    if (mevcut) {
      await prisma.serverNode.update({ where: { id: mevcut.id }, data: alanlar });
    } else {
      await prisma.serverNode.create({
        data: { ...alanlar, kind: "VPS", providerAccountId: hesapId, externalId: String(d.id) },
      });
    }
  }
  return `${veri.droplets.length} droplet eşitlendi`;
}
