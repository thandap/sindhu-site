import NextAuth, { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db/prisma";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: {},
        password: {},
        tenant: {},
      },
      async authorize(credentials) {
  console.log("LOGIN ATTEMPT credentials =", credentials);
  console.log("LOGIN ATTEMPT tenant =", credentials?.tenant);

  if (!credentials?.email || !credentials?.password || !credentials?.tenant) {
    console.log("Missing credentials or tenant");
    return null;
  }

  const user = await prisma.adminUser.findFirst({
    where: {
      email: credentials.email,
      tenant: {
        slug: credentials.tenant,
      },
      isActive: true,
    },
    include: { tenant: true },
  });

  console.log("FOUND USER =", user?.email, user?.tenant?.slug);

  if (!user) return null;

  const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

  console.log("PASSWORD VALID =", isValid);

  if (!isValid) return null;

  return {
    id: String(user.id),
    email: user.email,
    name: user.name,
    tenantSlug: user.tenant.slug,
  };
}
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = String(user.id);
        token.tenantSlug = user.tenantSlug;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.tenantSlug = token.tenantSlug as string | undefined;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };