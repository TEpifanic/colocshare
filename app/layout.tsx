import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NextAuthProvider } from "@/components/providers/auth-provider";
import { NavigationProvider } from "@/components/providers/navigation-provider";
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import NavigationIndicator from "@/components/ui/navigation-indicator";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Coloc Share - Gérez votre colocation simplement",
  description: "Une plateforme pour gérer votre colocation, partager les dépenses et organiser les tâches",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased ${inter.className}`}
      >
        <AuthProvider>
          <NextAuthProvider>
            <NavigationProvider>
              <NavigationIndicator />
              {children}
            </NavigationProvider>
          </NextAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
