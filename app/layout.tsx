import type React from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { NetworkStatus } from "@/components/network-status";
import JsonLd from "@/components/seo/JsonLd";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://lekvya.navedhana.com"),
  title: {
    default: "Lekvya | AI Automation, Transactional Email API & Multi-Industry Workflows",
    template: "%s | Lekvya",
  },
  description:
    "AI-powered multi-industry automation platform. Smart workflows and transactional email for Educational Institutions, Website Developers (EmailJS/Resend alternative), Healthcare Clinics, E-Commerce, SaaS, and Chartered Accountants.",
  keywords: [
    "Lekvya",
    "Navedhana",
    "AI automation platform",
    "transactional email API",
    "website contact form email API",
    "EmailJS alternative",
    "school fee reminder automation software",
    "college exam schedule notification system",
    "clinic appointment reminder software",
    "ecommerce shipment tracking emails",
    "CA practice management software India",
    "automated GST TDS filing reminders",
    "chartered accountant client onboarding portal",
    "bulk email scheduler for business",
    "SaaS onboarding email drips"
  ],
  authors: [{ name: "Navedhana", url: "https://navedhana.com" }],
  creator: "Navedhana",
  publisher: "Navedhana",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://lekvya.navedhana.com",
  },
  icons: {
    icon: [
      { url: "/Light.png", media: "(prefers-color-scheme: light)" },
      { url: "/Dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/Light.png",
  },
  openGraph: {
    title: "Lekvya | AI Automation, Transactional Email API & Multi-Industry Workflows",
    description:
      "Automate client communication, bulk scheduling, and transactional email workflows for Education, Healthcare, E-Commerce, Developers, and Financial Firms.",
    url: "https://lekvya.navedhana.com",
    siteName: "Lekvya",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/landing-assets/dashboard-preview.jpg",
        width: 1200,
        height: 630,
        alt: "Lekvya Multi-Industry Automation Platform Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lekvya | AI Automation & Multi-Industry Workflow Platform",
    description:
      "Smart email scheduling, contact form APIs, and workflow automation for Education, Healthcare, Developers, E-Commerce, and CAs.",
    images: ["/landing-assets/dashboard-preview.jpg"],
    creator: "@lekvya",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://lekvya.navedhana.com/#organization",
      name: "Lekvya",
      url: "https://lekvya.navedhana.com",
      logo: "https://lekvya.navedhana.com/landing-assets/lekvya-logo-new.png",
      sameAs: [
        "https://navedhana.com",
        "https://twitter.com/lekvya"
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@navedhana.com",
        availableLanguage: ["English", "Hindi"]
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://lekvya.navedhana.com/#website",
      url: "https://lekvya.navedhana.com",
      name: "Lekvya",
      description: "AI-Powered Automation, Transactional Email API & Multi-Industry Workflow Platform",
      publisher: {
        "@id": "https://lekvya.navedhana.com/#organization"
      }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://lekvya.navedhana.com/#software",
      name: "Lekvya AI Automation Platform",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web-based",
      offers: {
        "@type": "Offer",
        price: "499",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock"
      },
      description: "Automated client onboarding, bulk email scheduling, transactional form APIs, and industry-specific compliance alerts."
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <JsonLd data={organizationSchema} />
      </head>
      <body
        className={`${geistSans.className} ${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <NetworkStatus />
        </ThemeProvider>
      </body>
    </html>
  );
}
