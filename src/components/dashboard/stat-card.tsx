import { Card, CardContent } from "@/components/ui/card";

type StatCardProps = {
  baslik: string;
  deger: string;
  aciklama?: string;
};

export function StatCard({ baslik, deger, aciklama }: StatCardProps) {
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <p className="text-sm text-muted-foreground">{baslik}</p>
        <p className="truncate text-2xl font-semibold tracking-tight">{deger}</p>
        {aciklama && <p className="text-xs text-muted-foreground">{aciklama}</p>}
      </CardContent>
    </Card>
  );
}
