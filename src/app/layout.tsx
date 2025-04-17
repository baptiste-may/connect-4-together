import type {Metadata} from "next";
import "./globals.css";
import {ReactNode} from "react";
import ToastProvider from "@/components/providers/ToastProvider";
import ThemeProvider from "@/components/providers/ThemeProvider";
import {GoogleAnalytics} from "@next/third-parties/google";

const title = "Connect 4 Together";
const description = "Puissance 4 jusqu'à 4 joueurs en simultanés !";

export const metadata: Metadata = {
    title,
    description,
    icons: "./logo.webp",
    openGraph: {
        title, description
    }
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: ReactNode;
}>) {

    const googleAnalyticsGa = process.env.GOOGLE_ANALYTICS_GA;
    if (googleAnalyticsGa === undefined) throw new Error("GOOGLE_ANALYTICS_GA is not defined");

    return (
        <html lang="fr">
        <GoogleAnalytics gaId={googleAnalyticsGa}/>
        <body>
        <ThemeProvider>
            <ToastProvider>
                {children}
            </ToastProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}
