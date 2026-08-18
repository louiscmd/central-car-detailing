import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Fresh login — load everything from DB once
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id as string },
          select: { username: true, name: true, avatarUrl: true, role: true },
        });
        token.username = dbUser?.username;
        token.name = dbUser?.name ?? user.name;
        token.avatarUrl = dbUser?.avatarUrl;
        token.role = dbUser?.role ?? (user as { role?: string }).role;
        if (token.role === "CLIENT") {
          const portal = await prisma.clientPortal.findUnique({
            where: { userId: user.id as string },
            select: { clientId: true },
          });
          token.clientId = portal?.clientId;
        }
        return token;
      }

      // Explicit update() call from client — merge provided fields into token
      if (trigger === "update" && session) {
        return { ...token, ...session };
      }

      // Periodic refresh — verify user still exists, no extra field queries
      if (token.id) {
        const exists = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true },
        });
        if (!exists) return null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        (session.user as { role?: string; clientId?: string; username?: string; avatarUrl?: string }).role = token.role as string;
        (session.user as { role?: string; clientId?: string; username?: string; avatarUrl?: string }).clientId = token.clientId as string | undefined;
        (session.user as { role?: string; clientId?: string; username?: string; avatarUrl?: string }).username = token.username as string | undefined;
        (session.user as { role?: string; clientId?: string; username?: string; avatarUrl?: string }).avatarUrl = token.avatarUrl as string | undefined;
      }
      return session;
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
