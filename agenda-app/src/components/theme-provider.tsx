"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Module-level constant so ThemeScript's memoized props keep a stable
// identity across RSC re-renders (avoids React re-rendering the inline
// theme <script> on the client).
const themes = [
  "sandy",
  "olive",
  "contrast-light",
  "contrast-dark",
  "midnight",
  "frost",
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      themes={themes}
      defaultTheme="sandy"
      enableSystem={false}
    >
      {children}
    </NextThemesProvider>
  );
}
