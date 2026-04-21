import type React from "react"
import type { Metadata, Viewport } from "next"
import { Poppins } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
})

export const metadata: Metadata = {
  title: "LinkPayHub — One Link for All Your Payments",
  description:
    "Stop asking which app people use. Share one link and get paid anywhere. Works with Cash App, Venmo, PayPal, Zelle, Apple Pay, and more.",
  manifest: "/manifest.json",
  applicationName: "LinkPayHub",
  appleWebApp: {
    capable: true,
    title: "LinkPayHub",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "LinkPayHub — One Link for All Your Payments",
    description: "Share one link. Get paid anywhere. Cash App, Venmo, PayPal, Zelle, Apple Pay.",
    url: "https://linkpayhub.com",
    siteName: "LinkPayHub",
    type: "website",
    images: [
      {
        url: "/linkpayhub-wordmark.png",
        width: 1536,
        height: 1024,
        alt: "LinkPayHub",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkPayHub — One Link for All Your Payments",
    description: "Share one link. Get paid anywhere.",
    images: ["/linkpayhub-wordmark.png"],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#00e85a" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
