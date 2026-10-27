"use client";

import { Button } from "@/components/ui/button";

export default function PanelHatasi({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h2 className="text-lg font-semibold">Bir sorun oluştu</h2>
      <p className="text-sm text-muted-foreground">
        Sayfa yüklenirken beklenmeyen bir hata meydana geldi. Lütfen tekrar deneyin.
      </p>
      <Button onClick={() => reset()}>Tekrar Dene</Button>
    </div>
  );
}
