import type { DefaultSession } from "next-auth";
import type { AppRole } from "@/lib/rbac";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      companyName: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: AppRole;
    companyName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    companyName: string | null;
  }
}
