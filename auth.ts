import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  ADMIN_ACCOUNT_EMAIL,
  ADMIN_ACCOUNT_NAME,
  resolveAdminLoginIdentifier,
} from "@/lib/admin-account";
import { prisma } from "@/lib/prisma";

function matchesSiteGateLogin(input: string, password: string): boolean {
  const gateUser = process.env.SITE_GATE_USER?.trim().toLowerCase() || "admin";
  const gatePass = process.env.SITE_GATE_PASSWORD?.trim();
  if (!gatePass || password !== gatePass) return false;

  const login = input.trim().toLowerCase();
  return (
    login === gateUser ||
    login === "admin" ||
    login === ADMIN_ACCOUNT_EMAIL.toLowerCase()
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const normalizedEmail = resolveAdminLoginIdentifier(email);

        try {
          const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
          if (user?.password) {
            const valid = await bcrypt.compare(password, user.password);
            if (valid) {
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
              };
            }
          }
        } catch (error) {
          console.error("Auth database error:", error);
        }

        // Site-Gate-Login → echten DB-Admin nutzen (FK für Collection/Sealed)
        if (matchesSiteGateLogin(email, password)) {
          try {
            const admin = await prisma.user.findUnique({
              where: { email: ADMIN_ACCOUNT_EMAIL },
            });
            if (admin) {
              return {
                id: admin.id,
                email: admin.email,
                name: admin.name ?? ADMIN_ACCOUNT_NAME,
                image: admin.image,
              };
            }
          } catch (error) {
            console.error("Auth admin lookup error:", error);
          }
          // Ohne DB: Session möglich, aber keine persistente Collection
          return {
            id: "site-gate-admin",
            email: ADMIN_ACCOUNT_EMAIL,
            name: ADMIN_ACCOUNT_NAME,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});