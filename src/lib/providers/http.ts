// Sağlayıcı API'leri için ortak GET yardımcısı. Anahtar hata mesajlarına ASLA yazılmaz.

export async function saglayiciGet<T>(url: string, anahtar: string): Promise<T> {
  const yanit = await fetch(url, {
    headers: { Authorization: `Bearer ${anahtar}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (yanit.status === 401 || yanit.status === 403) {
    throw new Error("Anahtar reddedildi (yetkisiz). Anahtarı ve izinlerini kontrol edin.");
  }
  if (!yanit.ok) throw new Error(`Sağlayıcı ${yanit.status} durum kodu döndürdü.`);
  return (await yanit.json()) as T;
}
