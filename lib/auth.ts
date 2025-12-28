import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { refreshGoogleAccessToken } from "@/lib/google";
import { prisma } from "@/lib/prisma";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: `openid email profile ${CALENDAR_SCOPE}`,
          access_type: "offline",
          prompt: "consent"
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user }) {
      // Upsert user on sign-in
      if (user.email) {
        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name,
            image: user.image,
          },
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
          },
        })
      }
      return true
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        if (account.refresh_token) token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : undefined;
      }

      // Add userId to token
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true }
        })
        if (dbUser) {
          token.userId = dbUser.id
        }
      }

      if (token.expiresAt && Date.now() < token.expiresAt - 60_000) {
        return token;
      }

      if (token.accessToken && !token.expiresAt) {
        return token;
      }

      if (token.refreshToken) {
        return await refreshGoogleAccessToken(token);
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      session.userId = token.userId;
      return session;
    }
  }
};
