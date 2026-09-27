import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "سامیک | سامانه مدیریت یکپارچه کلاس",
  description:
    "سامانه یکپارچه مدیریت حضور و غیاب، نمره‌دهی و انضباط مدارس — چندمستاجره، آفلاین-فرست، و مبتنی بر نقش.",
  keywords: [
    "سامیک",
    "حضور و غیاب",
    "مدیریت مدرسه",
    "دفتر نمره",
    "آموزش",
    "SaaS",
  ],
  authors: [{ name: "Samik Team" }],
  icons: {
    icon: "/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1E3A8A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="font-persian antialiased bg-background text-foreground min-h-screen flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
