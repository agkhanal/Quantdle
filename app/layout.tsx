import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { PHProvider } from "./providers";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://quantdle.vercel.app";
const DESCRIPTION = "A daily quant puzzle. Solve it step by step, in six guesses.";

// Link previews (X, LinkedIn, Slack, iMessage...) use a generated card; the home page swaps in the day's own (see app/page.tsx).
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Quantdle",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Quantdle",
    title: "Quantdle",
    description: DESCRIPTION,
    images: [{ url: "/api/share?kind=site", width: 1200, height: 630, alt: "Quantdle, a daily quant puzzle" }],
  },
  twitter: { card: "summary_large_image", title: "Quantdle", description: DESCRIPTION, images: ["/api/share?kind=site"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#121316" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Cross-document page transitions: when the home page is reached from another page (Stats, Privacy, Terms),
            mark it as a "back" transition so the CSS can play the reverse of the way in, and skip the logo's pop-in. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `addEventListener("pagereveal",function(e){try{var t=e.viewTransition,f=navigation.activation&&navigation.activation.from;if(t&&f&&location.pathname==="/"&&new URL(f.url).pathname!=="/"){t.types.add("back");document.documentElement.dataset.nav="back"}}catch(_){}})`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%233f9a62'/><text x='16' y='23' font-family='monospace' font-weight='700' font-size='20' text-anchor='middle' fill='white'>Q</text></svg>"
        />
      </head>
      <body>
        <PHProvider>{children}</PHProvider>
      </body>
    </html>
  );
}
