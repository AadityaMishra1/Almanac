import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Providers } from "@/app/providers";
import { Navigation } from "@/components/navigation";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ToastNotifications } from "@/components/toast-notifications";
import { Instrument_Serif, DM_Sans } from "next/font/google";
import "@/app/globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Almanac",
    template: "%s | Almanac",
  },
  description:
    "Upload a syllabus PDF, AI extracts deadlines and exams, sync to Google Calendar in seconds.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
  openGraph: {
    title: "Almanac",
    description:
      "Upload a syllabus PDF, AI extracts deadlines and exams, sync to Google Calendar in seconds.",
    siteName: "Almanac",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Almanac",
    description:
      "Upload a syllabus PDF, AI extracts deadlines and exams, sync to Google Calendar in seconds.",
  },
  verification: {
    google: "DOF2vK4dA2URwZnf9BQuwIN3qEz43zoVgK3dyIociF8",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${instrumentSerif.variable} ${dmSans.variable}`}
    >
      <body className="antialiased">
        <Providers session={session}>
          <Navigation />
          <ToastNotifications />
          <ChatPanel />
          {children}
        </Providers>
      </body>
    </html>
  );
}
