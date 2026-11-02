
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      tenantSlug?: string | null;
      role?: string;
      accountType?: "tenant" | "platform";
    } & DefaultSession["user"];
  }

  interface User {
    tenantSlug?: string | null;
    role?: string;
    accountType?: "tenant" | "platform";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantSlug?: string | null;
    role?: string;
    accountType?: "tenant" | "platform";
  }
}
