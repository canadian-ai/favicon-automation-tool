import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
export const metadata: Metadata = {
    title: "Favicon Manager",
    description: "Deterministic favicon management for Next.js projects.",
    generator: 'v0.app',
    icons: {
        icon: [{
                url: "/icon-16x16.png",
                sizes: "16x16",
                type: "image/png"
            }, {
                url: "/icon-32x32.png",
                sizes: "32x32",
                type: "image/png"
            }, { url: "/icon.svg", type: "image/svg+xml" }],
        apple: "/apple-icon.png",
        shortcut: "/favicon.ico"
    },
    metadataBase: new URL("https://favicon.canadian-ai.ca"),
    openGraph: {
        type: "website",
        siteName: "Favicon Manager",
        title: "Favicon Manager",
        description: "Deterministic favicon management for Next.js projects.",
        url: "https://favicon.canadian-ai.ca",
        images: [{
                url: "/opengraph-image.png",
                width: 1200,
                height: 630,
                alt: "Favicon Manager"
            }]
    },
    twitter: {
        card: "summary_large_image",
        title: "Favicon Manager",
        description: "Deterministic favicon management for Next.js projects.",
        images: ["/twitter-image.png"]
    }
};
export default function RootLayout({ children, }: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="en">
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>);
}
