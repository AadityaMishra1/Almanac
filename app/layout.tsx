import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Providers } from "@/app/providers";
import { Navigation } from "@/components/navigation";
import Notifications from "@/frontend/components/Notifications";
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
  title: "Almanac — Syllabus to Calendar",
  description: "Upload a syllabus PDF, review extracted events, sync to Google Calendar."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={`${instrumentSerif.variable} ${dmSans.variable}`}>
      <body className="antialiased">
        <Providers session={session}>
          <Navigation />
          <div className="fixed top-4 right-4 z-50">
            <Notifications compact={true} />
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
