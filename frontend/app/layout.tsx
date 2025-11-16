import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Calendar - Smart Assignment Tracker",
  description: "Automatically track and manage course assignments with AI-powered deadline detection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
