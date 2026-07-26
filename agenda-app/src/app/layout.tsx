import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { PaletteSwitcher } from "@/components/palette-switcher";
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          themes={[
            "sandy",
            "olive",
            "contrast-light",
            "contrast-dark",
            "midnight",
            "frost",
          ]}
          defaultTheme="sandy"
          enableSystem={false}
        >
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
              <div className="ml-auto">
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
