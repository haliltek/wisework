"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

// Başarılı girişte yönlendirme hatası fırlatır (bu normaldir); hata mesajı döndürürse formda gösterilir
export async function girisYap(
  _onceki: string | undefined,
  formVerisi: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formVerisi.get("email"),
      password: formVerisi.get("password"),
      redirectTo: "/panel",
    });
  } catch (hata) {
    if (hata instanceof AuthError) {
      if (hata.type === "CredentialsSignin") {
        const kod = "code" in hata ? String((hata as unknown as { code: unknown }).code) : "";
        return kod === "cok_deneme"
          ? "Çok fazla hatalı deneme yapıldı. Lütfen 15 dakika sonra tekrar deneyin."
          : "E-posta veya şifre hatalı.";
      }
      // Auth.js, authorize içindeki beklenmeyen hataları CallbackRouteError olarak sarar.
      // Gerçek neden terminale yazılır; ekranda yalnızca veritabanı kaynaklı olanlar ayırt edilir.
      const neden = (hata as unknown as { cause?: { err?: { name?: string; code?: string; message?: string } } })
        .cause?.err;
      console.error("[giriş hatası]", hata.type, neden?.name, neden?.code, neden?.message);
      if (neden?.name?.startsWith("PrismaClient")) {
        return "Veritabanına ulaşılamıyor ya da tablolar oluşturulmamış. Terminaldeki '[giriş hatası]' satırına bakın.";
      }
      return "Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.";
    }
    throw hata;
  }
}
