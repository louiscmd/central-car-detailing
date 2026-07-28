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
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        if ((user as { role?: string }).role === "CLIENT") {
          const portal = await prisma.clientPortal.findUnique({
            where: { userId: user.id as string },
            select: { clientId: true },
          });
          token.clientId = portal?.clientId;
        }
      }
      // Refresh username/bio from DB on every token cycle or explicit update
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true, username: true, bio: true, avatarUrl: true, role: true },
        });
        if (!dbUser) return null; // invalidates session
        token.username = dbUser.username;
        token.bio = dbUser.bio;
        token.avatarUrl = dbUser.avatarUrl;
        token.role = dbUser.role; // keep role in sync
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string; clientId?: string; username?: string; bio?: string; avatarUrl?: string }).role = token.role as string;
        (session.user as { role?: string; clientId?: string; username?: string; bio?: string; avatarUrl?: string }).clientId = token.clientId as string | undefined;
        (session.user as { role?: string; clientId?: string; username?: string; bio?: string; avatarUrl?: string }).username = token.username as string | undefined;
        (session.user as { role?: string; clientId?: string; username?: string; bio?: string; avatarUrl?: string }).bio = token.bio as string | undefined;
        (session.user as { role?: string; clientId?: string; username?: string; bio?: string; avatarUrl?: string }).avatarUrl = token.avatarUrl as string | undefined;
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
