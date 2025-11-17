import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Import Export Dashboard",
  description: "Modern dashboard for import/export business analytics with interactive charts and data visualization.",
  keywords: ["dashboard", "import", "export", "analytics", "charts", "business"],
  authors: [{ name: "ImportExport Team" }],
  openGraph: {
    title: "Import Export Dashboard",
    description: "Modern dashboard for import/export business analytics",
    url: "https://chat.z.ai",
    siteName: "ImportExport",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Import Export Dashboard",
    description: "Modern dashboard for import/export business analytics",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
