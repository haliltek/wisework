"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// Dağıt düğmesi: yanlışlıkla tıklamaya karşı ikinci bir onay adımı ister
export function DagitFormu({
  ortamId,
  ortamAdi,
  action,
  devamEdiyor,
}: {
  ortamId: string;
  ortamAdi: string;
  action: (formVerisi: FormData) => Promise<void>;
  devamEdiyor: boolean;
}) {
  const [onay, setOnay] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  if (devamEdiyor) {
    return (
      <Button size="sm" variant="outline" disabled>
        Dağıtım sürüyor
      </Button>
    );
  }

  if (!onay) {
    return (
      <Button size="sm" onClick={() => setOnay(true)}>
        Dağıt
      </Button>
    );
  }

  return (
    <form
      action={action}
      onSubmit={() => setGonderiliyor(true)}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="ortamId" value={ortamId} />
      <span className="text-xs text-muted-foreground">{ortamAdi} ortamına dağıtılsın mı?</span>
      <Button type="submit" size="sm" disabled={gonderiliyor}>
        {gonderiliyor ? "Gönderiliyor..." : "Evet, dağıt"}
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={gonderiliyor} onClick={() => setOnay(false)}>
        Vazgeç
      </Button>
    </form>
  );
}
