import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PlanView from "@/components/plan/PlanView";
import JsonLd from "@/components/seo/JsonLd";
import { planFaqs } from "@/lib/plan-data";

export const metadata: Metadata = {
  title: "Plans & Pricing | Lekvya - AI Automation for Education, CAs, Healthcare & Developers",
  description:
    "Explore transparent Lekvya subscription plans starting at ₹499/month with a 7-day free trial. Automated email scheduling, student & client notifications, and developer form APIs.",
  keywords: [
    "Lekvya plans and pricing",
    "Lekvya pricing",
    "Lekvya subscription free trial",
    "CA practice management software price",
    "school fee reminder software pricing",
    "developer contact form API pricing",
    "EmailJS alternative pricing",
    "automated email scheduling software plans",
    "clinic appointment reminder software pricing",
    "Lekvya Basic Pro Premium plans"
  ],
  alternates: {
    canonical: "https://lekvya.navedhana.com/plan",
  },
  openGraph: {
    title: "Plans & Pricing | Lekvya Multi-Industry Automation Platform",
    description:
      "Simple, transparent pricing from ₹499/mo with a 7-day free trial. Purpose-built workflows for Education, Healthcare, CAs, E-Commerce, and Developers.",
    url: "https://lekvya.navedhana.com/plan",
    siteName: "Lekvya",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/landing-assets/dashboard-preview.jpg",
        width: 1200,
        height: 630,
        alt: "Lekvya Pricing Plans & Multi-Industry Automation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lekvya Plans & Pricing | 7-Day Free Trial Available",
    description:
      "Start automating client reminders, school notifications, and transactional emails from ₹499/mo.",
    images: ["/landing-assets/dashboard-preview.jpg"],
  },
};

const planStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://lekvya.navedhana.com"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Plans & Pricing",
          "item": "https://lekvya.navedhana.com/plan"
        }
      ]
    },
    {
      "@type": "Product",
      "name": "Lekvya AI Automation Platform Subscription",
      "image": "https://lekvya.navedhana.com/landing-assets/dashboard-preview.jpg",
      "description":
        "Unified AI-driven automation, transactional email API, and client reminder platform tailored for Education, Healthcare, CAs, E-Commerce, and Developers.",
      "brand": {
        "@type": "Brand",
        "name": "Lekvya"
      },
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": "INR",
        "lowPrice": "499",
        "highPrice": "999",
        "offerCount": "3",
        "offers": [
          {
            "@type": "Offer",
            "name": "Lekvya Basic Plan",
            "price": "499",
            "priceCurrency": "INR",
            "priceValidUntil": "2027-12-31",
            "availability": "https://schema.org/InStock",
            "url": "https://lekvya.navedhana.com/plan",
            "description": "7-day free trial included. Multi-industry templates, client onboarding, bulk email scheduler, and contact form API."
          },
          {
            "@type": "Offer",
            "name": "Lekvya Pro Plan",
            "price": "699",
            "priceCurrency": "INR",
            "priceValidUntil": "2027-12-31",
            "availability": "https://schema.org/PreOrder",
            "url": "https://lekvya.navedhana.com/plan",
            "description": "Unlimited custom templates, developer webhooks, open & click tracking analytics, and priority email queues."
          },
          {
            "@type": "Offer",
            "name": "Lekvya Premium Plan",
            "price": "999",
            "priceCurrency": "INR",
            "priceValidUntil": "2027-12-31",
            "availability": "https://schema.org/PreOrder",
            "url": "https://lekvya.navedhana.com/plan",
            "description": "Custom sending domain with SPF/DKIM/DMARC, white-label branding, dedicated SLA, and unlimited workspaces."
          }
        ]
      }
    },
    {
      "@type": "FAQPage",
      "mainEntity": planFaqs.map((faq) => ({
        "@type": "Question",
        "name": faq.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.a
        }
      }))
    }
  ]
};

export default function PlanPage() {
  return (
    <>
      <JsonLd data={planStructuredData} />
      <Navbar />
      <main className="pt-16">
        <PlanView />
      </main>
      <Footer />
    </>
  );
}
