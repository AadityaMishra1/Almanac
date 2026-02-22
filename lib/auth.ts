import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { refreshGoogleAccessToken } from "@/lib/google";
import { prisma } from "@/lib/db";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

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
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
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

        return true;
      } catch (error) {
        console.error("Error creating/updating user:", error);
        return false;
      }
    },
    async jwt({ token, account, user }) {
      // Initial sign-in: store user info in JWT
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at
          ? account.expires_at * 1000
          : undefined;
        // DO NOT use user.id from OAuth - it's not our DB ID
      }

      // Always fetch userId from database using email
      // This ensures we use our database ID, not the OAuth provider's ID
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true },
        });
        if (dbUser) {
          token.userId = dbUser.id;
        }
      }

      // Token still valid
      if (token.expiresAt && Date.now() < token.expiresAt - 60_000) {
        return token;
      }

      // No expiry set (shouldn't happen, but handle gracefully)
      if (token.accessToken && !token.expiresAt) {
        return token;
      }

      // Token expired - refresh it
      if (token.refreshToken) {
        try {
          const refreshedToken = await refreshGoogleAccessToken(token);

          // Update database with new tokens
          if (token.email) {
            await prisma.user.update({
              where: { email: token.email },
              data: {
                googleAccessToken: refreshedToken.accessToken as string,
                googleTokenExpiry: refreshedToken.expiresAt
                  ? new Date(refreshedToken.expiresAt as number)
                  : null,
              },
            });
          }

          return refreshedToken;
        } catch (error) {
          console.error("Token refresh failed:", error);
          return { ...token, error: "RefreshAccessTokenError" as const };
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Add userId to session - but only if we successfully got it from DB
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      } else if (session.user && !token.userId) {
        // Critical: userId not found in database
        // This should not happen if signIn callback succeeded
        console.error(
          "Session error: userId not found for email:",
          token.email,
        );
        // Don't set id - this will cause auth checks to fail gracefully
      }

      // Expose boolean flag (not the raw token) to the client
      session.hasCalendarAccess = !!token.accessToken;
      session.error = token.error as "RefreshAccessTokenError" | undefined;

      return session;
    },
  },
};
