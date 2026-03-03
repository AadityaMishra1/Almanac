import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development",
  pages: {
    error: "/",
  },
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: `openid email profile ${CALENDAR_SCOPE}`,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  events: {
    async signOut({ token }) {
      // Revoke Google token and clear from database on sign-out
      if (token?.email) {
        const user = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { googleAccessToken: true, googleRefreshToken: true },
        });

        // Revoke the access token at Google (best-effort)
        if (user?.googleAccessToken) {
          try {
            const revokeUrl = new URL("https://oauth2.googleapis.com/revoke");
            revokeUrl.searchParams.set("token", user.googleAccessToken);
            await fetch(revokeUrl, { method: "POST" });
          } catch {
            // Non-fatal: token will expire naturally
          }
        }

        // Clear tokens from database
        await prisma.user.update({
          where: { email: token.email as string },
          data: {
            googleAccessToken: null,
            googleRefreshToken: null,
            googleTokenExpiry: null,
          },
        });
      }
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // Create or update User in database on sign-in
      if (!user.email) return false;

      try {
        await prisma.user.upsert({
          where: { email: user.email },
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
            // Store Google OAuth tokens
            googleAccessToken: account?.access_token,
            googleRefreshToken: account?.refresh_token,
            googleTokenExpiry: account?.expires_at
              ? new Date(account.expires_at * 1000)
              : null,
          },
          update: {
            name: user.name,
            image: user.image,
            // Update tokens on re-authentication
            googleAccessToken: account?.access_token || undefined,
            googleRefreshToken: account?.refresh_token || undefined,
            googleTokenExpiry: account?.expires_at
              ? new Date(account.expires_at * 1000)
              : undefined,
          },
        });
      } catch (error) {
        console.error("Error creating/updating user:", error);
        return false; // Block sign-in — a session without userId is useless
      }

      return true;
    },
    async jwt({ token, account, user }) {
      // Initial sign-in: persist hasCalendarAccess flag
      if (account && user) {
        token.hasCalendarAccess = !!account.access_token;
        // DO NOT store accessToken/refreshToken in JWT — they stay in the DB only
      }

      // Always fetch userId from database using email
      if (token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true },
          });
          if (dbUser) {
            token.userId = dbUser.id;
          } else {
            console.warn("JWT callback: no user found in DB for", token.email);
          }
        } catch (error) {
          console.error(
            "JWT callback: failed to fetch userId for",
            token.email,
            error,
          );
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Add userId to session
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      } else if (session.user && !token.userId) {
        console.error(
          "Session error: userId not found for email:",
          token.email,
        );
      }

      // Expose boolean flag (not the raw token) to the client
      session.hasCalendarAccess = !!token.hasCalendarAccess;
      session.error = token.error as "RefreshAccessTokenError" | undefined;

      return session;
    },
  },
};
