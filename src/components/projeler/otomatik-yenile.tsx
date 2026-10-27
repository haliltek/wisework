"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Devam eden dağıtım varken 8 saniyede bir durumu GitHub'dan çekip sayfayı yeniler
export function OtomatikYenile({
  slug,
  aktif,
  yenile,
}: {
  slug: string;
  aktif: boolean;
  yenile: (slug: string) => Promise<void>;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!aktif) return;
    let durdu = false;
    const zamanlayici = setInterval(async () => {
      try {
        await yenile(slug);
      } finally {
        if (!durdu) router.refresh();
      }
    }, 8000);
    return () => {
      durdu = true;
      clearInterval(zamanlayici);
    };
  }, [aktif, slug, yenile, router]);

  return aktif ? (
    <p className="text-xs text-muted-foreground">Dağıtım izleniyor, durum 8 saniyede bir güncellenir.</p>
  ) : null;
}
