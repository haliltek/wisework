import { saglayiciGet } from "./http";

// OpenRouter kredi bakiyesi (yönetim anahtarı gerekir): toplam satın alınan - toplam kullanılan
export async function openRouterEsitle(_hesapId: string, anahtar: string): Promise<string> {
  const yanit = await saglayiciGet<{ data: { total_credits: number; total_usage: number } }>(
    "https://openrouter.ai/api/v1/credits",
    anahtar,
  );
  const kalan = yanit.data.total_credits - yanit.data.total_usage;
  return `Kalan kredi: $${kalan.toFixed(2)} (toplam $${yanit.data.total_credits.toFixed(2)}, kullanılan $${yanit.data.total_usage.toFixed(2)})`;
}
