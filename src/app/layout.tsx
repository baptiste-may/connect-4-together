import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ReactNode } from "react";
import ToastProvider from "@/components/providers/ToastProvider";
import ThemeProvider from "@/components/providers/ThemeProvider";
import {
  SITE_URL,
  UMAMI_DOMAINS,
  UMAMI_SCRIPT_URL,
  UMAMI_WEBSITE_ID,
} from "@/libs/static";
import UmamiProvider from "next-umami";

const title = "Connect 4 Together";
const description = "Puissance 4 jusqu'à 4 joueurs en simultanés !";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  icons: "./logo.webp",
  openGraph: {
    title,
    description,
    images: "/image.webp",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF0000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        {UMAMI_WEBSITE_ID !== "" && (
          <UmamiProvider
            websiteId={UMAMI_WEBSITE_ID}
            src={UMAMI_SCRIPT_URL}
            domains={UMAMI_DOMAINS}
            performance
          />
        )}
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
