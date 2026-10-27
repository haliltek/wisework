"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { Marka } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MARKA_ALT_BASLIK } from "@/lib/brand";
import { ROL_ETIKETLERI } from "@/lib/labels";
import { cn } from "@/lib/utils";

type MenuOgesi = { href: string; label: string; section: string };

type PanelShellProps = {
  kullanici: { ad: string; rol: string; firma: string | null };
  menu: MenuOgesi[];
  cikisAction: () => Promise<void>;
  children: React.ReactNode;
};

export function PanelShell({ kullanici, menu, cikisAction, children }: PanelShellProps) {
  const [menuAcik, setMenuAcik] = useState(false);
  const yol = usePathname();

  // Sayfa değişince mobil menüyü kapat
  useEffect(() => setMenuAcik(false), [yol]);

  function aktifMi(href: string) {
    return href === "/panel" ? yol === "/panel" : yol === href || yol.startsWith(href + "/");
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      {menuAcik && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMenuAcik(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          menuAcik ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link href="/panel" className="leading-tight">
            <Marka className="block text-lg" />
            <span className="block text-[11px] text-muted-foreground">{MARKA_ALT_BASLIK}</span>
          </Link>
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setMenuAcik(false)}>
            Kapat
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Ana menü">
          {menu.map((oge, sira) => {
            const aktif = aktifMi(oge.href);
            const yeniBolum = sira === 0 || menu[sira - 1].section !== oge.section;
            return (
              <Fragment key={oge.href}>
                {yeniBolum && oge.section !== "Genel" && (
                  <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {oge.section}
                  </p>
                )}
                <Link
                  href={oge.href}
                  aria-current={aktif ? "page" : undefined}
                  className={cn(
                    "block truncate rounded-md border-l-2 px-3 py-2 text-sm transition-colors",
                    aktif
                      ? "border-primary bg-sidebar-accent font-medium text-accent-foreground"
                      : "border-transparent hover:bg-muted hover:text-foreground",
                  )}
                >
                  {oge.label}
                </Link>
              </Fragment>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-5 py-4 text-xs">
          <p className="truncate font-medium text-foreground">{kullanici.firma ?? kullanici.ad}</p>
          <p className="mt-0.5 text-muted-foreground">{ROL_ETIKETLERI[kullanici.rol] ?? kullanici.rol}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card px-4 sm:px-6">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMenuAcik(true)}>
            Menü
          </Button>
          <div className="flex-1" />
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-sm font-medium">{kullanici.ad}</span>
            <Badge variant={kullanici.rol === "SUPER_ADMIN" ? "default" : "secondary"}>
              {ROL_ETIKETLERI[kullanici.rol] ?? kullanici.rol}
            </Badge>
          </div>
          <form action={cikisAction}>
            <Button variant="outline" size="sm" type="submit">
              Çıkış Yap
            </Button>
          </form>
        </header>

        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
