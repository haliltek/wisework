import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Oturum ve rol kontrolü (Edge). Asıl kurallar auth.config.ts içindeki `authorized` fonksiyonundadır.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // /api/v1/license/verify gibi herkese açık uçlar bilerek kapsam dışıdır
  matcher: ["/panel/:path*", "/giris", "/api/admin/:path*"],
};
