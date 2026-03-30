import type { Metadata, Viewport } from "next";

import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/layout/theme-provider";
import "./globals.css";

// Font loaded via CSS fallback

export const metadata: Metadata = {
  title: {
    default: "StagerVault",
    template: "%s | StagerVault",
  },
  description: "Warehouse & logistics management for home stagers and interior designers.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#e38a28",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents zoom on mobile input focus
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
