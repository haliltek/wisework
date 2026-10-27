"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { girisYap } from "./actions";

export function GirisFormu() {
  const [hata, eylem, bekliyor] = useActionState(girisYap, undefined);

  return (
    <form action={eylem} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="ornek@firma.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Şifre</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      {hata && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {hata}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={bekliyor}>
        {bekliyor ? "Giriş yapılıyor..." : "Giriş Yap"}
      </Button>
    </form>
  );
}
