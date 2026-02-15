import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CMMS App",
  description: "Maintenance Management System",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 flex flex-col md:flex-row min-h-screen`}>
        {/* We show navbar on all pages, but conditionally handle login page in specific layouts if needed. 
              For now, simple global layout. */}
        <Navbar />
        <main className="flex-1 p-4 mb-16 md:mb-0 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
