import type { Metadata } from "next";
import { Cormorant_Garamond, Jost, Geist_Mono } from "next/font/google";
import { BottomTabNav } from "@/components/bottom-tab-nav";
import { isAdmin } from "@/lib/auth";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const admin = await isAdmin();
  return (
    <html
      lang="cs"
      className={`${jost.variable} ${cormorant.variable} ${cormorantItalic.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-transparent">
        {/* Bottom padding clears the fixed tab bar. --nav-h is the nav's live
            rendered height (published by BottomTabNav) and already includes the
            iOS safe-area inset; +0.5rem is a small breathing gap. */}
        <div className="flex-1 pb-[calc(var(--nav-h)+0.5rem)]">{children}</div>
        <BottomTabNav isAdmin={admin} />
      </body>
    </html>
  );
}
