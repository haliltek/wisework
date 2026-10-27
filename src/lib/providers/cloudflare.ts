import { prisma } from "@/lib/prisma";
import { saglayiciGet } from "./http";

interface Bolge {
  id: string;
  name: string;
  name_servers?: string[];
}

// Cloudflare bölgelerini (zone) Alan Adı kayıtlarıyla eşitler. Var olan alan adlarına
// zone kimliği ve name server bilgisi yazılır; olmayanlar kayıt firması belirtilmeden eklenir.
export async function cloudflareEsitle(_hesapId: string, anahtar: string): Promise<string> {
  const yanit = await saglayiciGet<{ result: Bolge[] }>(
    "https://api.cloudflare.com/client/v4/zones?per_page=50",
    anahtar,
  );

  for (const b of yanit.result) {
    const alanlar = { cloudflareZoneId: b.id, nameservers: b.name_servers ?? [] };
    await prisma.domain.upsert({
      where: { name: b.name },
      update: alanlar,
      create: { name: b.name, ...alanlar },
    });
  }
  return `${yanit.result.length} bölge eşitlendi`;
}
