"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { hesabiEsitle } from "@/lib/providers";
import { requirePermission } from "@/lib/session";

// "Eşitle" düğmesi: sağlayıcı API'sinden güncel veriyi çeker
export async function esitleAction(formVerisi: FormData): Promise<void> {
  const kullanici = await requirePermission("providers:manage");
  const hesapId = String(formVerisi.get("hesapId") ?? "");
  if (!hesapId) return;

  const sonuc = await hesabiEsitle(hesapId);
  await writeAudit({
    userId: kullanici.id,
    action: "provider.sync",
    entityType: "ProviderAccount",
    entityId: hesapId,
    summary: `Sağlayıcı eşitlemesi ${sonuc.basarili ? "başarılı" : "başarısız"}: ${sonuc.mesaj}`,
  });
  revalidatePath("/panel/saglayicilar");
  revalidatePath("/panel/sunucular");
  revalidatePath("/panel/alan-adlari");
}
