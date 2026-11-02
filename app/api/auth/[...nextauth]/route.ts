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
        loginType: {},
      },

async authorize(credentials) {
  const email = credentials?.email?.trim().toLowerCase();
  const password = credentials?.password;
  const loginType = credentials?.loginType;

  if (!email || !password) {
    return null;
  }

  // Cohesion platform administrator
  if (loginType === "platform") {
    const platformAdmin = await prisma.platformAdmin.findUnique({
      where: { email },
    });

    if (!platformAdmin || !platformAdmin.isActive) {
      return null;
    }

    const isValid = await bcrypt.compare(
      password,
      platformAdmin.passwordHash
    );

    if (!isValid) return null;

    return {
      id: platformAdmin.id,
      email: platformAdmin.email,
      name: platformAdmin.name,
      role: platformAdmin.role,
      accountType: "platform",
      tenantSlug: null,
    };
  }

  // Existing restaurant administrator
  if (loginType && loginType !== "tenant") {
    return null;
  }

  const tenantSlug = credentials?.tenant?.trim();

  if (!tenantSlug) {
    return null;
  }

  const user = await prisma.adminUser.findFirst({
    where: {
      email,
      isActive: true,
      tenant: {
        slug: tenantSlug,
        isActive: true,
      },
    },
    include: { tenant: true },
  });

  if (!user) return null;

  const isValid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!isValid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    accountType: "tenant",
    tenantSlug: user.tenant.slug,
  };
}

    }),
  ],

callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.sub = String(user.id);
      token.tenantSlug = user.tenantSlug ?? null;
      token.role = user.role;
      token.accountType = user.accountType;
      token.name = user.name;
      token.email = user.email;
    }

    return token;
  },

  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.sub;
      session.user.tenantSlug = token.tenantSlug;
      session.user.role = token.role;
      session.user.accountType = token.accountType;
      session.user.name = token.name;
      session.user.email = token.email;
    }

    return session;
  },
},

};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
