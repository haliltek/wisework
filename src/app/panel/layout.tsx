import { PanelShell } from "@/components/layout/panel-shell";
import { cikisYap } from "@/app/actions/auth";
import { navForRole } from "@/lib/nav";
import { requireUser } from "@/lib/session";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const kullanici = await requireUser();

  return (
    <PanelShell
      kullanici={{
        ad: kullanici.name ?? "Kullanıcı",
        rol: kullanici.role,
        firma: kullanici.companyName,
      }}
      menu={navForRole(kullanici.role)}
      cikisAction={cikisYap}
    >
      {children}
    </PanelShell>
  );
}
