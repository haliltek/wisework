import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ModulYakindaProps = {
  baslik: string;
  aciklama: string;
  adim: number;
  ozellikler: string[];
};

// Henüz geliştirilmemiş modüller için yer tutucu sayfa
export function ModulYakinda({ baslik, aciklama, adim, ozellikler }: ModulYakindaProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{baslik}</h1>
        <p className="text-sm text-muted-foreground">{aciklama}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Bu modül yakında eklenecek</CardTitle>
            <Badge variant="warning">ADIM {adim}</Badge>
          </div>
          <CardDescription>Aşağıdaki özellikler bu adımda geliştirilecek.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {ozellikler.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
