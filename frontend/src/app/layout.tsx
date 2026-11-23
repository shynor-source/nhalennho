import type { Metadata } from "next";
import { Be_Vietnam_Pro, Lora } from "next/font/google";

import { FloatingContact } from "@/components/floating-contact";
import { PageTransition } from "@/components/page-transition";
import { ScrollToTop } from "@/components/scroll-to-top";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/lib/site-config";

import "./globals.css";

// Deliberate type pairing: Lora (warm editorial serif) for headings,
// Be Vietnam Pro (built for Vietnamese) for body text. Both ship a
// Vietnamese subset, which the site needs.
const lora = Lora({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-lora",
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const site = getSiteConfig();
  return {
    metadataBase: new URL(site.url),
    title: {
      default: `${site.name} — ${site.tagline}`,
      template: `%s · ${site.name}`,
    },
    description: site.description,
    applicationName: site.name,
    openGraph: {
      type: "website",
      locale: "vi_VN",
      siteName: site.name,
      title: `${site.name} — ${site.tagline}`,
      description: site.description,
      url: site.url,
    },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const site = getSiteConfig();

  return (
    <html lang="vi" className={`${lora.variable} ${beVietnamPro.variable}`}>
      <body className="flex min-h-dvh flex-col bg-cream text-ink">
        <ScrollToTop />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-white focus:px-4 focus:py-2 focus:shadow-soft"
        >
          Chuyển đến nội dung chính
        </a>
        <SiteHeader siteName={site.name} />
        <main id="main" className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <SiteFooter
          siteName={site.name}
          zaloUrl={site.zaloUrl}
          facebookUrl={site.facebookUrl}
        />
        <FloatingContact
          zaloUrl={site.zaloUrl}
          facebookUrl={site.facebookUrl}
        />
      </body>
    </html>
  );
}
