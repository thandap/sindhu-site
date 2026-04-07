import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      tenantSlug?: string;
    } & DefaultSession["user"];
  }

  interface User {
    tenantSlug?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantSlug?: string;
  }
}