import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { clearFailures, isBlocked, registerFailure } from "@/lib/rate-limit";

// Çok fazla hatalı denemede fırlatılır; giriş formu bunu ayırt eder
class TooManyAttempts extends CredentialsSignin {
  code = "cok_deneme";
}

// Kullanıcı yokken de bcrypt süresi harcanır (zamanlama farkından kullanıcı tespitini zorlaştırır)
const SAHTE_HASH = bcrypt.hashSync("sahte-sifre-zamanlama-korumasi", 12);

const girisSemasi = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(ham) {
        const veri = girisSemasi.safeParse(ham);
        if (!veri.success) return null;

        const email = veri.data.email.toLowerCase();
        if (isBlocked(email)) throw new TooManyAttempts();

        const kullanici = await prisma.user.findUnique({ where: { email } });
        const hash = kullanici?.passwordHash ?? SAHTE_HASH;
        const dogru = await bcrypt.compare(veri.data.password, hash);

        if (!kullanici || !kullanici.isActive || !dogru) {
          registerFailure(email);
          return null;
        }

        clearFailures(email);
        return {
          id: kullanici.id,
          name: kullanici.name,
          email: kullanici.email,
          role: kullanici.role,
          companyName: kullanici.companyName,
        };
      },
    }),
  ],
});
