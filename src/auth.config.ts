import type { NextAuthConfig } from "next-auth";
import { canAccessPath, type AppRole } from "@/lib/rbac";

// Edge uyumlu yapılandırma (middleware tarafından kullanılır).
// Veritabanı ve bcrypt burada KULLANILMAZ; bunlar auth.ts içindedir.
export const authConfig = {
  pages: { signIn: "/giris" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 }, // 12 saat
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const kullanici = auth?.user;
      const yol = nextUrl.pathname;

      // API uçları: oturum yoksa 401, yetki yoksa 403 (JSON, Türkçe)
      if (yol.startsWith("/api/")) {
        if (!kullanici) {
          return Response.json({ hata: "Oturum açmanız gerekiyor." }, { status: 401 });
        }
        if (!canAccessPath(kullanici.role, yol)) {
          return Response.json({ hata: "Bu işlem için yetkiniz yok." }, { status: 403 });
        }
        return true;
      }

      // Giriş sayfası: oturum açıksa panele yönlendir
      if (yol === "/giris") {
        if (kullanici) return Response.redirect(new URL("/panel", nextUrl));
        return true;
      }

      // Panel: oturum yoksa false => /giris sayfasına yönlendirilir
      if (!kullanici) return false;

      // Rolün izin matrisinde karşılığı olmayan yollar engellenir
      if (!canAccessPath(kullanici.role, yol)) {
        return Response.redirect(new URL("/panel?yetkisiz=1", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.companyName = user.companyName ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role as AppRole;
      session.user.companyName = token.companyName ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;
