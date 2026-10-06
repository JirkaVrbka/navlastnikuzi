import type { Metadata } from "next";
import { Cormorant_Garamond, Jost, Geist_Mono } from "next/font/google";
import { BottomTabNav } from "@/components/bottom-tab-nav";
import "./globals.css";

// Body / UI font. latin-ext covers Czech diacritics (ě š č ř ž ý á í é ú ů ...).
const jost = Jost({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
});

// Display / heading font. latin-ext covers Czech diacritics (ě š č ř ž ý á í é ú ů ...).
const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

// Italic display face declared as a SEPARATE instance (single style). A non-variable
// Google font combining multiple weights with style:["normal","italic"] trips a
// Turbopack bug; one style per instance is the documented workaround.
const cormorantItalic = Cormorant_Garamond({
  variable: "--font-display-italic",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  style: "italic",
});

// Monospace kept only for the MCP-token display.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "NaVlastniKuzi",
  description: "Organizační nástroj pro LARP hru ve stylu Zrádců.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="cs"
      className={`${jost.variable} ${cormorant.variable} ${cormorantItalic.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-transparent">
        {/* Bottom padding clears the fixed tab bar (+ iOS safe-area inset). */}
        <div className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
        <BottomTabNav />
      </body>
    </html>
  );
}
