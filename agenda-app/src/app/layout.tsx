import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Poppins, Roboto } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PaletteSwitcher } from "@/components/palette-switcher";
import { FontSwitcher } from "@/components/font-switcher";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Alternative UI fonts offered by the header font switcher (globals.css maps
// html[data-font] to these variables).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Agenda — Meeting agenda builder",
  description: "Build meeting agendas with drag-and-drop ordering.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${roboto.variable} ${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <header className="border-b">
            <div className="mx-auto flex h-14 max-w-4xl items-center gap-6 px-4">
              <Link href="/agendas" className="font-semibold tracking-tight">
                Agenda
              </Link>
              <nav className="flex items-center gap-4 text-sm text-muted-foreground">
                <Link href="/agendas" className="hover:text-foreground">
                  Agendas
                </Link>
                <Link href="/templates" className="hover:text-foreground">
                  Templates
                </Link>
              </nav>
              <div className="ml-auto flex items-center gap-1">
                <FontSwitcher />
                <PaletteSwitcher />
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
            {children}
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
