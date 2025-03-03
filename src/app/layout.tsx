import type {Metadata} from "next";
import "./globals.css";
import {ReactNode} from "react";
import NameProvider from "@/components/providers/NameProvider";
import ClientProvider from "@/components/providers/ClientProvider";
import ToastProvider from "@/components/providers/ToastProvider";
import ThemeProvider from "@/components/providers/ThemeProvider";

export const metadata: Metadata = {
    title: "Connect 4 Together",
    icons: "./logo.webp"
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: ReactNode;
}>) {
    return (
        <html lang="fr">
        <body>
        <ThemeProvider>
            <ToastProvider>
                <ClientProvider>
                    <NameProvider>
                        {children}
                    </NameProvider>
                </ClientProvider>
            </ToastProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}
