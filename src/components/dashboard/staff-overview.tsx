import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { navForRole } from "@/lib/nav";
import { hasPermission, type AppRole } from "@/lib/rbac";
import { UsageBars } from "./usage-bars";

// Geliştirici ve Destek gibi finans izni olmayan dahili roller için Genel Bakış
export async function StaffOverview({ rol }: { rol: AppRole }) {
  const baglantilar = navForRole(rol).filter((o) => o.href !== "/panel");
  const sunucuGoster = hasPermission(rol, "servers:view");

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className={sunucuGoster ? "lg:col-span-2" : "lg:col-span-3"}>
        <CardHeader>
          <CardTitle>Erişebildiğiniz Modüller</CardTitle>
          <CardDescription>Rolünüzün izinlerine göre listelenir.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {baglantilar.map((b) => (
              <li key={b.href}>
                <Link
                  href={b.href}
                  className="flex items-center justify-between py-3 text-sm hover:text-primary"
                >
                  <span>{b.label}</span>
                  <span className="text-xs text-muted-foreground">Aç</span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {sunucuGoster && (
        <Card>
          <CardHeader>
            <CardTitle>Sunucu Durumu</CardTitle>
            <CardDescription>Uygulamanın çalıştığı sunucu, anlık</CardDescription>
          </CardHeader>
          <CardContent>
            <UsageBars />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
