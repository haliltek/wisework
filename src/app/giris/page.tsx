import type { Metadata } from "next";
import { Marka } from "@/components/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MARKA_ALT_BASLIK } from "@/lib/brand";
import { GirisFormu } from "./giris-formu";

export const metadata: Metadata = { title: "Giriş Yap" };

export default function GirisSayfasi() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1>
            <Marka className="text-3xl" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{MARKA_ALT_BASLIK}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Giriş Yap</CardTitle>
            <CardDescription>Hesabınızla oturum açın.</CardDescription>
          </CardHeader>
          <CardContent>
            <GirisFormu />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
